"""Model GraduationRequest — fluxo de aprovação de mudança de graduação.

Regras de negócio:
- Solicitada por: professor individual do atleta OU manager da academia dele
- Aprovada/rejeitada por: apenas admin
- Status: pending → approved | rejected
- Quando aprovada, a graduação do atleta é atualizada e a request fica como "approved"
- Quando rejeitada, a graduação NÃO muda e fica registrado o motivo
"""
from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.athlete import Athlete


class GraduationRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class GraduationRequest(Base):
    __tablename__ = "graduation_requests"

    id: Mapped[int] = mapped_column(primary_key=True)

    # --- Atleta alvo ---
    athlete_id: Mapped[int] = mapped_column(
        ForeignKey("athletes.id", ondelete="CASCADE"), nullable=False
    )
    athlete: Mapped["Athlete"] = relationship(
        "Athlete",
        back_populates="graduation_requests_received",
        foreign_keys=[athlete_id],
    )

    # --- Graduações antes e depois ---
    from_graduation: Mapped[str] = mapped_column(String(32), nullable=False)
    to_graduation: Mapped[str] = mapped_column(String(32), nullable=False)

    # --- Quem solicitou ---
    requested_by_id: Mapped[int] = mapped_column(
        ForeignKey("athletes.id", ondelete="RESTRICT"), nullable=False
    )
    requested_by: Mapped["Athlete"] = relationship(
        "Athlete",
        back_populates="graduation_requests_made",
        foreign_keys=[requested_by_id],
    )

    # --- Quem revisou (admin) ---
    reviewed_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("athletes.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_by: Mapped["Athlete | None"] = relationship(
        "Athlete",
        foreign_keys=[reviewed_by_id],
    )

    # --- Status e observações ---
    status: Mapped[GraduationRequestStatus] = mapped_column(
        Enum(GraduationRequestStatus, name="graduation_request_status"),
        nullable=False,
        default=GraduationRequestStatus.pending,
    )
    reason: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Justificativa do solicitante"
    )
    review_notes: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Observações do admin ao aprovar/rejeitar"
    )

    # --- Timestamps ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    @property
    def is_pending(self) -> bool:
        return self.status == GraduationRequestStatus.pending

    @property
    def is_approved(self) -> bool:
        return self.status == GraduationRequestStatus.approved

    @property
    def is_rejected(self) -> bool:
        return self.status == GraduationRequestStatus.rejected
