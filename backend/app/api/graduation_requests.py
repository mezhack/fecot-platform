"""Endpoints de fluxo de aprovação de graduação.

Fluxo:
    1. Teacher/manager do atleta cria um POST /api/graduation_requests (status=pending)
    2. Admin lista GET /api/graduation_requests?status=pending
    3. Admin aprova (POST .../approve) → aplica a nova graduação no atleta
       ou rejeita (POST .../reject) → apenas registra
"""
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import (
    get_current_athlete,
    require_admin,
)
from app.db.session import get_db
from app.models.athlete import Athlete
from app.models.graduation_request import GraduationRequest, GraduationRequestStatus
from app.schemas.graduation_request import (
    GraduationRequestCreate,
    GraduationRequestRead,
    GraduationRequestReview,
)

router = APIRouter(prefix="/graduation_requests", tags=["Graduation Requests"])


def _load_full(db: Session, request_id: int) -> GraduationRequest | None:
    stmt = (
        select(GraduationRequest)
        .options(
            selectinload(GraduationRequest.athlete),
            selectinload(GraduationRequest.requested_by),
            selectinload(GraduationRequest.reviewed_by),
        )
        .where(GraduationRequest.id == request_id)
    )
    return db.scalar(stmt)


# --------------------------------------------------------------
# LIST
# --------------------------------------------------------------

@router.get("", response_model=list[GraduationRequestRead])
def list_requests(
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[Athlete, Depends(get_current_athlete)],
    req_status: GraduationRequestStatus | None = Query(None, alias="status"),
    athlete_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> list[GraduationRequestRead]:
    stmt = select(GraduationRequest).options(
        selectinload(GraduationRequest.athlete),
        selectinload(GraduationRequest.requested_by),
        selectinload(GraduationRequest.reviewed_by),
    )

    if req_status is not None:
        stmt = stmt.where(GraduationRequest.status == req_status)
    if athlete_id is not None:
        stmt = stmt.where(GraduationRequest.athlete_id == athlete_id)

    # Não-admins só veem requests que eles fizeram ou recebidas por atletas sob sua responsabilidade
    if not current.is_admin:
        managed_ids = [a.id for a in current.managed_academies]
        # Atletas que o current pode gerenciar: próprios alunos + alunos das academias que gerencia
        sub = select(Athlete.id).where(
            (Athlete.professor_id == current.id)
            | (Athlete.home_academy_id.in_(managed_ids) if managed_ids else False)
        )
        stmt = stmt.where(
            (GraduationRequest.requested_by_id == current.id)
            | (GraduationRequest.athlete_id.in_(sub))
        )

    stmt = stmt.order_by(GraduationRequest.created_at.desc()).offset(skip).limit(limit)
    rows = db.scalars(stmt).all()
    return [GraduationRequestRead.from_model(r) for r in rows]


# --------------------------------------------------------------
# CREATE
# --------------------------------------------------------------

@router.post("", response_model=GraduationRequestRead, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: GraduationRequestCreate,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[Athlete, Depends(get_current_athlete)],
) -> GraduationRequestRead:
    athlete = db.get(Athlete, payload.athlete_id)
    if athlete is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Atleta não encontrado",
        )

    if not current.can_request_graduation_change(athlete):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Apenas o professor individual do atleta, o gestor da academia dele, "
                "ou um administrador pode solicitar mudança de graduação."
            ),
        )

    if payload.to_graduation == athlete.graduation:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A graduação nova é igual à atual",
        )

    # Uma request pendente por atleta por vez
    existing = db.scalar(
        select(GraduationRequest).where(
            GraduationRequest.athlete_id == athlete.id,
            GraduationRequest.status == GraduationRequestStatus.pending,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe uma solicitação pendente para este atleta (id={existing.id})",
        )

    req = GraduationRequest(
        athlete_id=athlete.id,
        from_graduation=athlete.graduation,
        to_graduation=payload.to_graduation,
        requested_by_id=current.id,
        reason=payload.reason,
        status=GraduationRequestStatus.pending,
    )
    db.add(req)
    db.commit()

    loaded = _load_full(db, req.id)
    assert loaded is not None
    return GraduationRequestRead.from_model(loaded)


# --------------------------------------------------------------
# GET ONE
# --------------------------------------------------------------

@router.get("/{request_id}", response_model=GraduationRequestRead)
def get_request(
    request_id: int,
    db: Annotated[Session, Depends(get_db)],
    _current: Annotated[Athlete, Depends(get_current_athlete)],
) -> GraduationRequestRead:
    req = _load_full(db, request_id)
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")
    return GraduationRequestRead.from_model(req)


# --------------------------------------------------------------
# APPROVE — só admin
# --------------------------------------------------------------

@router.post("/{request_id}/approve", response_model=GraduationRequestRead)
def approve_request(
    request_id: int,
    payload: GraduationRequestReview,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[Athlete, Depends(require_admin)],
) -> GraduationRequestRead:
    req = _load_full(db, request_id)
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")

    if not req.is_pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Solicitação já foi {req.status.value}, não pode ser aprovada",
        )

    # Aplica a nova graduação no atleta
    req.athlete.graduation = req.to_graduation

    req.status = GraduationRequestStatus.approved
    req.reviewed_by_id = current.id
    req.reviewed_at = datetime.utcnow()
    req.review_notes = payload.review_notes

    db.commit()
    # Expira o cache pra forçar reload dos relacionamentos (reviewed_by)
    db.expire(req)
    loaded = _load_full(db, request_id)
    assert loaded is not None
    return GraduationRequestRead.from_model(loaded)


# --------------------------------------------------------------
# REJECT — só admin
# --------------------------------------------------------------

@router.post("/{request_id}/reject", response_model=GraduationRequestRead)
def reject_request(
    request_id: int,
    payload: GraduationRequestReview,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[Athlete, Depends(require_admin)],
) -> GraduationRequestRead:
    req = _load_full(db, request_id)
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")

    if not req.is_pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Solicitação já foi {req.status.value}, não pode ser rejeitada",
        )

    req.status = GraduationRequestStatus.rejected
    req.reviewed_by_id = current.id
    req.reviewed_at = datetime.utcnow()
    req.review_notes = payload.review_notes

    db.commit()
    db.expire(req)
    loaded = _load_full(db, request_id)
    assert loaded is not None
    return GraduationRequestRead.from_model(loaded)
