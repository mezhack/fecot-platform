"""Schemas Pydantic de GraduationRequest (fluxo de aprovação)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.graduations import GRADUATIONS
from app.models.graduation_request import GraduationRequestStatus


class GraduationRequestCreate(BaseModel):
    athlete_id: int
    to_graduation: str = Field(description="Nova graduação pretendida")
    reason: str | None = Field(None, description="Justificativa do solicitante")

    @field_validator("to_graduation")
    @classmethod
    def validate_grad(cls, v: str) -> str:
        if v not in GRADUATIONS:
            raise ValueError(f"Graduação inválida. Use uma de: {', '.join(GRADUATIONS)}")
        return v


class GraduationRequestReview(BaseModel):
    """Payload de aprovação/rejeição (endpoint separado)."""
    review_notes: str | None = None


class GraduationRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    athlete_id: int
    from_graduation: str
    to_graduation: str
    requested_by_id: int
    reviewed_by_id: int | None
    status: GraduationRequestStatus
    reason: str | None
    review_notes: str | None
    created_at: datetime
    reviewed_at: datetime | None

    # Derivados pra facilitar o frontend
    athlete_name: str | None = None
    requested_by_name: str | None = None
    reviewed_by_name: str | None = None

    @classmethod
    def from_model(cls, r) -> "GraduationRequestRead":  # noqa: ANN001
        return cls(
            id=r.id,
            athlete_id=r.athlete_id,
            from_graduation=r.from_graduation,
            to_graduation=r.to_graduation,
            requested_by_id=r.requested_by_id,
            reviewed_by_id=r.reviewed_by_id,
            status=r.status,
            reason=r.reason,
            review_notes=r.review_notes,
            created_at=r.created_at,
            reviewed_at=r.reviewed_at,
            athlete_name=r.athlete.name if r.athlete else None,
            requested_by_name=r.requested_by.name if r.requested_by else None,
            reviewed_by_name=r.reviewed_by.name if r.reviewed_by else None,
        )
