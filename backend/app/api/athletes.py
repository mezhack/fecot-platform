"""CRUD de atletas com as regras de permissão atualizadas.

Regras importantes:
- `graduation` NÃO pode ser alterada diretamente via PATCH — tem endpoint separado
  (POST /api/graduation_requests). Admin é exceção (pode alterar direto).
- Quem pode editar dados básicos: admin, o próprio atleta, manager da academia, professor individual.
- Quem pode criar: teacher, manager, admin.
- Quem pode remover: apenas admin (atletas são histórico da federação).
"""
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import (
    get_current_athlete,
    require_admin,
    require_teacher_or_above,
)
from app.core.graduations import can_be_professor
from app.core.security import hash_password
from app.db.session import get_db
from app.models.athlete import Athlete, AthleteRole
from app.schemas.athlete import AthleteCreate, AthleteRead, AthleteUpdate
from app.services.avatar_storage import delete_avatar, save_avatar

router = APIRouter(prefix="/athletes", tags=["Athletes"])


def _check_role_requires_dan(role: AthleteRole, graduation: str) -> None:
    """teacher e academy_manager precisam ≥ 1º Dan."""
    if role in (AthleteRole.teacher, AthleteRole.academy_manager):
        if not can_be_professor(graduation):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Atletas com role '{role.value}' precisam ter graduação ≥ 1º Dan",
            )


def _check_unique(
    db: Session,
    *,
    email: str | None,
    cpf: str | None,
    exclude_id: int | None = None,
) -> None:
    if email:
        q = select(Athlete).where(Athlete.email == email)
        if exclude_id is not None:
            q = q.where(Athlete.id != exclude_id)
        if db.scalar(q):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Já existe um atleta com o email {email}",
            )
    if cpf:
        q = select(Athlete).where(Athlete.cpf == cpf)
        if exclude_id is not None:
            q = q.where(Athlete.id != exclude_id)
        if db.scalar(q):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um atleta com este CPF",
            )


def _validate_professor(db: Session, professor_id: int | None) -> None:
    if professor_id is None:
        return
    prof = db.get(Athlete, professor_id)
    if prof is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Professor informado não existe",
        )
    if not can_be_professor(prof.graduation):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O professor precisa ter graduação ≥ 1º Dan",
        )


# --------------------------------------------------------------
# LIST
# --------------------------------------------------------------

@router.get("", response_model=list[AthleteRead])
def list_athletes(
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[Athlete, Depends(get_current_athlete)],
    home_academy_id: int | None = Query(None),
    role: AthleteRole | None = Query(None),
    active: bool | None = Query(None),
    search: str | None = Query(None, description="Busca por nome, email ou CPF"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> list[AthleteRead]:
    # Atletas comuns não listam outros atletas - devem usar /api/me
    if current.role == AthleteRole.athlete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Atletas não podem listar outros atletas. Use GET /api/me para ver seu perfil.",
        )

    stmt = select(Athlete).options(
        selectinload(Athlete.home_academy),
        selectinload(Athlete.professor),
        selectinload(Athlete.teaching_at),
    )

    if home_academy_id is not None:
        stmt = stmt.where(Athlete.home_academy_id == home_academy_id)
    if role is not None:
        stmt = stmt.where(Athlete.role == role)
    if active is not None:
        stmt = stmt.where(Athlete.active == active)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                Athlete.name.ilike(like),
                Athlete.email.ilike(like),
                Athlete.cpf.ilike(like),
            )
        )

    stmt = stmt.order_by(Athlete.name).offset(skip).limit(limit)
    rows = db.scalars(stmt).all()
    return [AthleteRead.from_model(a) for a in rows]


# --------------------------------------------------------------
# GET ONE
# --------------------------------------------------------------

@router.get("/{athlete_id}", response_model=AthleteRead)
def get_athlete(
    athlete_id: int,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[Athlete, Depends(get_current_athlete)],
) -> AthleteRead:
    # Atleta comum só pode ver a si mesmo via esta rota; senão use /api/me
    if current.role == AthleteRole.athlete and current.id != athlete_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para ver dados de outros atletas",
        )

    athlete = db.get(Athlete, athlete_id)
    if athlete is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atleta não encontrado")
    return AthleteRead.from_model(athlete)


# --------------------------------------------------------------
# CREATE
# --------------------------------------------------------------

@router.post("", response_model=AthleteRead, status_code=status.HTTP_201_CREATED)
def create_athlete(
    payload: AthleteCreate,
    db: Annotated[Session, Depends(get_db)],
    _current: Annotated[Athlete, Depends(require_teacher_or_above)],
) -> AthleteRead:
    _check_unique(db, email=payload.email, cpf=payload.cpf)
    _validate_professor(db, payload.professor_id)
    _check_role_requires_dan(payload.role, payload.graduation)

    raw_password = payload.password or payload.cpf
    password_digest = hash_password(raw_password) if raw_password else None

    athlete = Athlete(
        name=payload.name,
        email=payload.email,
        cpf=payload.cpf,
        phone=payload.phone,
        birth_date=payload.birth_date,
        weight_kg=payload.weight_kg,
        sex=payload.sex,
        graduation=payload.graduation,
        role=payload.role,
        home_academy_id=payload.home_academy_id,
        professor_id=payload.professor_id,
        active=payload.active,
        password_digest=password_digest,
    )
    db.add(athlete)
    db.commit()
    db.refresh(athlete)
    return AthleteRead.from_model(athlete)


# --------------------------------------------------------------
# UPDATE
# --------------------------------------------------------------

def _update_athlete(
    athlete_id: int,
    payload: AthleteUpdate,
    db: Session,
    current: Athlete,
) -> AthleteRead:
    athlete = db.get(Athlete, athlete_id)
    if athlete is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atleta não encontrado")

    if not current.can_edit_athlete_basic(athlete):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para editar este atleta",
        )

    data = payload.model_dump(exclude_unset=True)

    # Role só pode ser alterada por admin
    if "role" in data and current.role != AthleteRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem alterar o papel (role) de um atleta",
        )

    new_email = data.get("email", athlete.email)
    new_cpf = data.get("cpf", athlete.cpf)
    _check_unique(db, email=new_email, cpf=new_cpf, exclude_id=athlete.id)

    if "professor_id" in data:
        _validate_professor(db, data["professor_id"])

    # Se está trocando o role, checa se o role novo é compatível com a graduação
    if "role" in data:
        _check_role_requires_dan(data["role"], athlete.graduation)

    if "password" in data:
        pw = data.pop("password")
        if pw:
            athlete.password_digest = hash_password(pw)

    for field, value in data.items():
        setattr(athlete, field, value)

    db.commit()
    db.refresh(athlete)
    return AthleteRead.from_model(athlete)


@router.patch("/{athlete_id}", response_model=AthleteRead)
def patch_athlete(
    athlete_id: int,
    payload: AthleteUpdate,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[Athlete, Depends(get_current_athlete)],
) -> AthleteRead:
    return _update_athlete(athlete_id, payload, db, current)


@router.put("/{athlete_id}", response_model=AthleteRead)
def put_athlete(
    athlete_id: int,
    payload: AthleteUpdate,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[Athlete, Depends(get_current_athlete)],
) -> AthleteRead:
    return _update_athlete(athlete_id, payload, db, current)


# --------------------------------------------------------------
# DELETE — só admin
# --------------------------------------------------------------

@router.delete("/{athlete_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_athlete(
    athlete_id: int,
    db: Annotated[Session, Depends(get_db)],
    _current: Annotated[Athlete, Depends(require_admin)],
) -> None:
    athlete = db.get(Athlete, athlete_id)
    if athlete is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atleta não encontrado")

    if athlete.students:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível remover um atleta que é professor de outros atletas",
        )
    if athlete.managed_academies:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível remover um atleta que é responsável por academias",
        )

    db.delete(athlete)
    db.commit()


# --------------------------------------------------------------
# Avatar — admin/teacher pode trocar avatar de outros atletas
# --------------------------------------------------------------

def _can_manage_avatar(current: Athlete, target: Athlete) -> bool:
    """Quem pode mexer no avatar de outro atleta.

    - O próprio (já tratado pelo /me/avatar)
    - Admin: sempre
    - Teacher/manager: se for responsável pelo atleta (mesma regra de can_edit)
    """
    if current.id == target.id:
        return True
    return current.can_edit_athlete_basic(target)


@router.post("/{athlete_id}/avatar", response_model=AthleteRead)
async def upload_athlete_avatar(
    athlete_id: int,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[Athlete, Depends(get_current_athlete)],
    file: UploadFile = File(..., description="JPEG/PNG/WebP, máx 5 MB"),
) -> AthleteRead:
    """Upload de avatar de outro atleta (admin/manager/professor responsável)."""
    target = db.get(Athlete, athlete_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atleta não encontrado")

    if not _can_manage_avatar(current, target):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para alterar o avatar deste atleta",
        )

    new_url = await save_avatar(file)
    old_url = target.avatar_url
    target.avatar_url = new_url
    db.commit()
    db.refresh(target)

    if old_url and old_url != new_url:
        delete_avatar(old_url)

    return AthleteRead.from_model(target)


@router.delete("/{athlete_id}/avatar", response_model=AthleteRead)
def delete_athlete_avatar(
    athlete_id: int,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[Athlete, Depends(get_current_athlete)],
) -> AthleteRead:
    target = db.get(Athlete, athlete_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atleta não encontrado")

    if not _can_manage_avatar(current, target):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para remover o avatar deste atleta",
        )

    old_url = target.avatar_url
    target.avatar_url = None
    db.commit()
    db.refresh(target)

    if old_url:
        delete_avatar(old_url)

    return AthleteRead.from_model(target)
