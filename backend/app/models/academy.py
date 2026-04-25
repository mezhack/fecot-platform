"""Model Academy — academia/escola de taekwondo filiada à FECOT.

Regras de negócio:
- Tem um MANAGER (gestor/responsável, role=academy_manager ou admin, ≥ 1º Dan)
- Pode ter vários TEACHERS (professores que ensinam lá, role=teacher+, ≥ 1º Dan)
- Tem uma lista de STUDENTS (atletas cuja home_academy_id aponta pra cá)
- Posição GPS usada num mapa interativo pra visitantes encontrarem a academia
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.athlete import Athlete


class Academy(Base):
    __tablename__ = "academies"

    id: Mapped[int] = mapped_column(primary_key=True)

    # --- Identificação ---
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    cnpj: Mapped[str | None] = mapped_column(String(18), unique=True, nullable=True)

    # --- Endereço ---
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(2), nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # --- Localização GPS (pro mapa interativo) ---
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Contato ---
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # --- Flags ---
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # --- Gestor (único) ---
    manager_id: Mapped[int] = mapped_column(
        ForeignKey("athletes.id", ondelete="RESTRICT"),
        nullable=False,
    )
    manager: Mapped["Athlete"] = relationship(
        "Athlete",
        back_populates="managed_academies",
        foreign_keys=[manager_id],
    )

    # --- Professores (N:N) ---
    teachers: Mapped[list["Athlete"]] = relationship(
        "Athlete",
        secondary="academy_teachers",
        back_populates="teaching_at",
    )

    # --- Alunos (atletas cuja home_academy é esta) ---
    students: Mapped[list["Athlete"]] = relationship(
        "Athlete",
        back_populates="home_academy",
        foreign_keys="Athlete.home_academy_id",
    )

    # --- Timestamps ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Propriedades derivadas
    # ------------------------------------------------------------------
    @property
    def manager_name(self) -> str | None:
        return self.manager.name if self.manager else None

    @property
    def manager_contact(self) -> str | None:
        if not self.manager:
            return None
        return self.manager.phone or self.manager.email

    @property
    def students_count(self) -> int:
        return len(self.students) if self.students is not None else 0

    @property
    def teachers_count(self) -> int:
        return len(self.teachers) if self.teachers is not None else 0
