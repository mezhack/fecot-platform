"""Dependências reutilizáveis do FastAPI."""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.athlete import Athlete, AthleteRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login", auto_error=False)


def get_current_athlete(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> Athlete:
    """Extrai o atleta autenticado do JWT."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise unauthorized

    payload = decode_token(token)
    if not payload:
        raise unauthorized

    sub = payload.get("sub")
    if not sub:
        raise unauthorized

    try:
        athlete_id = int(sub)
    except (TypeError, ValueError):
        raise unauthorized

    athlete = db.get(Athlete, athlete_id)
    if athlete is None or not athlete.active:
        raise unauthorized
    return athlete


def require_admin(
    current: Annotated[Athlete, Depends(get_current_athlete)],
) -> Athlete:
    if current.role != AthleteRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem executar esta ação",
        )
    return current


def require_manager_or_admin(
    current: Annotated[Athlete, Depends(get_current_athlete)],
) -> Athlete:
    """Academy manager ou admin."""
    if current.role not in (AthleteRole.academy_manager, AthleteRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas gestores de academia ou administradores podem executar esta ação",
        )
    return current


def require_teacher_or_above(
    current: Annotated[Athlete, Depends(get_current_athlete)],
) -> Athlete:
    """Teacher, manager ou admin."""
    if current.role not in (
        AthleteRole.teacher,
        AthleteRole.academy_manager,
        AthleteRole.admin,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas professores, gestores ou administradores podem executar esta ação",
        )
    return current
