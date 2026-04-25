"""Endpoints de autenticação."""
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_athlete
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.athlete import Athlete
from app.schemas.athlete import (
    AthleteRead,
    LoginRequest,
    SelfUpdateRequest,
    TokenResponse,
    UpdatePasswordRequest,
)
from app.services.avatar_storage import delete_avatar, save_avatar

router = APIRouter(tags=["Auth"])


def _find_by_identifier(db: Session, identifier: str) -> Athlete | None:
    """Busca atleta por email OU CPF (aceita com ou sem pontuação)."""
    identifier = identifier.strip()
    if "@" in identifier:
        return db.scalar(select(Athlete).where(Athlete.email == identifier))
    import re
    cpf_digits = re.sub(r"\D", "", identifier)
    if cpf_digits:
        return db.scalar(select(Athlete).where(Athlete.cpf == cpf_digits))
    return None


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    athlete = _find_by_identifier(db, payload.identifier)

    if not athlete or not athlete.password_digest:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    if not athlete.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta inativa. Entre em contato com o administrador.",
        )

    if not verify_password(payload.password, athlete.password_digest):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    token = create_access_token(
        subject=athlete.id,
        extra_claims={"role": athlete.role.value},
    )
    return TokenResponse(
        access_token=token,
        athlete=AthleteRead.from_model(athlete),
    )


@router.get("/me", response_model=AthleteRead)
def me(
    current: Annotated[Athlete, Depends(get_current_athlete)],
) -> AthleteRead:
    return AthleteRead.from_model(current)


@router.patch("/me", response_model=AthleteRead)
def update_me(
    payload: SelfUpdateRequest,
    current: Annotated[Athlete, Depends(get_current_athlete)],
    db: Annotated[Session, Depends(get_db)],
) -> AthleteRead:
    """Auto-edição de dados pessoais pelo próprio atleta.

    NÃO permite alterar campos federativos (role, graduation, academia, professor, cpf).
    Se precisar desses, use os endpoints administrativos.
    """
    data = payload.model_dump(exclude_unset=True)

    # Validação de unicidade: email não pode colidir com outro atleta
    if "email" in data and data["email"] and data["email"] != current.email:
        existing = db.scalar(
            select(Athlete).where(
                Athlete.email == data["email"],
                Athlete.id != current.id,
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Já existe outro atleta com o email {data['email']}",
            )

    for field, value in data.items():
        setattr(current, field, value)

    db.commit()
    db.refresh(current)
    return AthleteRead.from_model(current)


@router.patch("/update_password", status_code=status.HTTP_204_NO_CONTENT)
def update_password(
    payload: UpdatePasswordRequest,
    current: Annotated[Athlete, Depends(get_current_athlete)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    if not current.password_digest or not verify_password(
        payload.current_password, current.password_digest
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha atual incorreta",
        )

    current.password_digest = hash_password(payload.new_password)
    db.commit()


# --------------------------------------------------------------
# Avatar — auto-upload (qualquer atleta autenticado)
# --------------------------------------------------------------

@router.post("/me/avatar", response_model=AthleteRead)
async def upload_my_avatar(
    current: Annotated[Athlete, Depends(get_current_athlete)],
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(..., description="Imagem JPEG, PNG ou WebP (máx 5 MB)"),
) -> AthleteRead:
    """Faz upload da própria foto de perfil.

    Aceita JPEG, PNG, WebP até 5 MB. O servidor redimensiona pra 512x512
    max e converte pra WebP. O arquivo antigo é deletado do disco.
    """
    new_url = await save_avatar(file)

    old_url = current.avatar_url
    current.avatar_url = new_url
    db.commit()
    db.refresh(current)

    if old_url and old_url != new_url:
        delete_avatar(old_url)

    return AthleteRead.from_model(current)


@router.delete("/me/avatar", response_model=AthleteRead)
def delete_my_avatar(
    current: Annotated[Athlete, Depends(get_current_athlete)],
    db: Annotated[Session, Depends(get_db)],
) -> AthleteRead:
    """Remove a foto de perfil do usuário autenticado."""
    old_url = current.avatar_url
    current.avatar_url = None
    db.commit()
    db.refresh(current)

    if old_url:
        delete_avatar(old_url)

    return AthleteRead.from_model(current)
