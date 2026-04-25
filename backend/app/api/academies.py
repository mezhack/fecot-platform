"""CRUD de academias + gerenciamento de professores associados.

Regras:
- Criar/editar/remover academia: apenas admin
- Manager precisa ser ≥ 1º Dan
- Professores associados precisam ser teachers (ou acima) e ≥ 1º Dan
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_athlete, require_admin, require_manager_or_admin
from app.core.graduations import can_be_professor
from app.db.session import get_db
from app.models.academy import Academy
from app.models.athlete import Athlete, AthleteRole
from app.schemas.academy import (
    AcademyCreate,
    AcademyRead,
    AcademyTeacherLink,
    AcademyUpdate,
)

router = APIRouter(prefix="/academies", tags=["Academies"])


def _validate_manager(db: Session, manager_id: int) -> Athlete:
    manager = db.get(Athlete, manager_id)
    if manager is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Gestor (manager) não encontrado",
        )
    if not can_be_professor(manager.graduation):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O gestor precisa ter graduação ≥ 1º Dan",
        )
    if manager.role not in (AthleteRole.academy_manager, AthleteRole.admin):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O gestor precisa ter role 'academy_manager' ou 'admin'",
        )
    return manager


def _check_unique_cnpj(db: Session, cnpj: str | None, exclude_id: int | None = None) -> None:
    if not cnpj:
        return
    q = select(Academy).where(Academy.cnpj == cnpj)
    if exclude_id is not None:
        q = q.where(Academy.id != exclude_id)
    if db.scalar(q):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma academia com este CNPJ",
        )


def _load_academy_full(db: Session, academy_id: int) -> Academy | None:
    stmt = (
        select(Academy)
        .options(
            selectinload(Academy.manager),
            selectinload(Academy.teachers),
            selectinload(Academy.students),
        )
        .where(Academy.id == academy_id)
    )
    return db.scalar(stmt)


# --------------------------------------------------------------
# LIST
# --------------------------------------------------------------

@router.get("", response_model=list[AcademyRead])
def list_academies(
    db: Annotated[Session, Depends(get_db)],
    _current: Annotated[Athlete, Depends(get_current_athlete)],
    active: bool | None = Query(None),
    search: str | None = Query(None, description="Busca por nome ou cidade"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> list[AcademyRead]:
    stmt = select(Academy).options(
        selectinload(Academy.manager),
        selectinload(Academy.teachers),
        selectinload(Academy.students),
    )

    if active is not None:
        stmt = stmt.where(Academy.active == active)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(or_(Academy.name.ilike(like), Academy.city.ilike(like)))

    stmt = stmt.order_by(Academy.name).offset(skip).limit(limit)
    rows = db.scalars(stmt).all()
    return [AcademyRead.from_model(a) for a in rows]


# --------------------------------------------------------------
# PUBLIC MAP LISTING (sem auth — p/ mapa público)
# --------------------------------------------------------------

@router.get("/public/map", response_model=list[AcademyRead])
def public_map(db: Annotated[Session, Depends(get_db)]) -> list[AcademyRead]:
    """Endpoint público para o mapa na home — retorna apenas academias ativas com coordenadas."""
    stmt = (
        select(Academy)
        .options(selectinload(Academy.manager))
        .where(
            Academy.active.is_(True),
            Academy.latitude.is_not(None),
            Academy.longitude.is_not(None),
        )
        .order_by(Academy.name)
    )
    return [AcademyRead.from_model(a) for a in db.scalars(stmt).all()]


# --------------------------------------------------------------
# GET ONE
# --------------------------------------------------------------

@router.get("/{academy_id}", response_model=AcademyRead)
def get_academy(
    academy_id: int,
    db: Annotated[Session, Depends(get_db)],
    _current: Annotated[Athlete, Depends(get_current_athlete)],
) -> AcademyRead:
    academy = _load_academy_full(db, academy_id)
    if academy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academia não encontrada")
    return AcademyRead.from_model(academy)


# --------------------------------------------------------------
# CREATE — só admin
# --------------------------------------------------------------

@router.post("", response_model=AcademyRead, status_code=status.HTTP_201_CREATED)
def create_academy(
    payload: AcademyCreate,
    db: Annotated[Session, Depends(get_db)],
    _current: Annotated[Athlete, Depends(require_admin)],
) -> AcademyRead:
    _check_unique_cnpj(db, payload.cnpj)
    _validate_manager(db, payload.manager_id)

    academy = Academy(**payload.model_dump())
    db.add(academy)
    db.commit()
    db.refresh(academy)
    academy = _load_academy_full(db, academy.id)
    assert academy is not None
    return AcademyRead.from_model(academy)


# --------------------------------------------------------------
# UPDATE
# --------------------------------------------------------------

def _update_academy(academy_id: int, payload: AcademyUpdate, db: Session) -> AcademyRead:
    academy = db.get(Academy, academy_id)
    if academy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academia não encontrada")

    data = payload.model_dump(exclude_unset=True)

    if "cnpj" in data:
        _check_unique_cnpj(db, data["cnpj"], exclude_id=academy.id)

    if "manager_id" in data and data["manager_id"] is not None:
        _validate_manager(db, data["manager_id"])

    for field, value in data.items():
        setattr(academy, field, value)

    db.commit()
    db.refresh(academy)
    academy = _load_academy_full(db, academy.id)
    assert academy is not None
    return AcademyRead.from_model(academy)


@router.patch("/{academy_id}", response_model=AcademyRead)
def patch_academy(
    academy_id: int,
    payload: AcademyUpdate,
    db: Annotated[Session, Depends(get_db)],
    _current: Annotated[Athlete, Depends(require_manager_or_admin)],
) -> AcademyRead:
    return _update_academy(academy_id, payload, db)


@router.put("/{academy_id}", response_model=AcademyRead)
def put_academy(
    academy_id: int,
    payload: AcademyUpdate,
    db: Annotated[Session, Depends(get_db)],
    _current: Annotated[Athlete, Depends(require_manager_or_admin)],
) -> AcademyRead:
    return _update_academy(academy_id, payload, db)


# --------------------------------------------------------------
# DELETE — só admin
# --------------------------------------------------------------

@router.delete("/{academy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_academy(
    academy_id: int,
    db: Annotated[Session, Depends(get_db)],
    _current: Annotated[Athlete, Depends(require_admin)],
) -> None:
    academy = _load_academy_full(db, academy_id)
    if academy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academia não encontrada")

    if academy.students:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível remover uma academia que possui alunos vinculados",
        )

    db.delete(academy)
    db.commit()


# --------------------------------------------------------------
# TEACHERS management — N:N
# --------------------------------------------------------------

@router.post(
    "/{academy_id}/teachers",
    response_model=AcademyRead,
    status_code=status.HTTP_200_OK,
)
def add_teacher(
    academy_id: int,
    payload: AcademyTeacherLink,
    db: Annotated[Session, Depends(get_db)],
    _current: Annotated[Athlete, Depends(require_manager_or_admin)],
) -> AcademyRead:
    academy = _load_academy_full(db, academy_id)
    if academy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academia não encontrada")

    teacher = db.get(Athlete, payload.athlete_id)
    if teacher is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Atleta não encontrado",
        )
    if not can_be_professor(teacher.graduation):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Apenas atletas com graduação ≥ 1º Dan podem ser professores",
        )
    if teacher.role not in (
        AthleteRole.teacher,
        AthleteRole.academy_manager,
        AthleteRole.admin,
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Atleta precisa ter role 'teacher', 'academy_manager' ou 'admin'",
        )

    if any(t.id == teacher.id for t in academy.teachers):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este professor já está associado à academia",
        )

    academy.teachers.append(teacher)
    db.commit()
    academy = _load_academy_full(db, academy_id)
    assert academy is not None
    return AcademyRead.from_model(academy)


@router.delete(
    "/{academy_id}/teachers/{athlete_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_teacher(
    academy_id: int,
    athlete_id: int,
    db: Annotated[Session, Depends(get_db)],
    _current: Annotated[Athlete, Depends(require_manager_or_admin)],
) -> None:
    academy = _load_academy_full(db, academy_id)
    if academy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academia não encontrada")

    teacher = next((t for t in academy.teachers if t.id == athlete_id), None)
    if teacher is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este professor não está associado a esta academia",
        )

    academy.teachers.remove(teacher)
    db.commit()
