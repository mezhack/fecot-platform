"""Model Athlete — atleta da FECOT.

Regras de negócio:
- Campos: name, cpf, birth_date, weight_kg, sex, graduation, role
- Role: athlete | teacher | academy_manager | admin
- Cada atleta tem UM professor individual (professor_id) e UMA academia onde estuda (home_academy_id)
- Um atleta com role=teacher pode ENSINAR em múltiplas academias (N:N via academy_teachers)
- Um atleta com role=academy_manager gerencia uma ou mais academias (via Academy.manager_id)
- Só atletas com graduação ≥ 1º Dan podem ser teacher ou academy_manager
"""
from __future__ import annotations

import enum
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.academy import Academy
    from app.models.graduation_request import GraduationRequest


class AthleteRole(str, enum.Enum):
    """Papéis semânticos do sistema.

    - athlete:         aluno comum da FECOT
    - teacher:         professor (pode ensinar em academias, ≥ 1º Dan)
    - academy_manager: gestor/responsável de academia (≥ 1º Dan)
    - admin:           administrador geral da federação
    """
    athlete = "athlete"
    teacher = "teacher"
    academy_manager = "academy_manager"
    admin = "admin"


class AthleteSex(str, enum.Enum):
    """Sexo biológico — usado pra categorias de competição."""
    male = "male"
    female = "female"


class Athlete(Base):
    __tablename__ = "athletes"

    id: Mapped[int] = mapped_column(primary_key=True)

    # --- Identificação ---
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    cpf: Mapped[str | None] = mapped_column(String(14), unique=True, nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)

    # --- Dados pessoais / esportivos ---
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    sex: Mapped[AthleteSex | None] = mapped_column(
        Enum(AthleteSex, name="athlete_sex"),
        nullable=True,
    )

    # --- Graduação / papel ---
    graduation: Mapped[str] = mapped_column(String(32), nullable=False)
    role: Mapped[AthleteRole] = mapped_column(
        Enum(AthleteRole, name="athlete_role"),
        nullable=False,
        default=AthleteRole.athlete,
    )

    # --- Auth ---
    password_digest: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # --- Flags ---
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # --- Avatar (URL — upload real fica pra depois via S3/Cloudinary) ---
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # --- Academia "casa" (onde o atleta estuda como aluno) ---
    home_academy_id: Mapped[int | None] = mapped_column(
        ForeignKey("academies.id", ondelete="SET NULL"), nullable=True
    )
    home_academy: Mapped["Academy | None"] = relationship(
        "Academy",
        back_populates="students",
        foreign_keys=[home_academy_id],
    )

    # --- Professor individual ---
    professor_id: Mapped[int | None] = mapped_column(
        ForeignKey("athletes.id", ondelete="SET NULL"), nullable=True
    )
    professor: Mapped["Athlete | None"] = relationship(
        "Athlete",
        remote_side="Athlete.id",
        back_populates="students",
        foreign_keys=[professor_id],
    )
    students: Mapped[list["Athlete"]] = relationship(
        "Athlete",
        back_populates="professor",
        foreign_keys="Athlete.professor_id",
    )

    # --- Academias onde este atleta ENSINA (só faz sentido se role=teacher) ---
    # Relação N:N, definida na tabela academy_teachers
    teaching_at: Mapped[list["Academy"]] = relationship(
        "Academy",
        secondary="academy_teachers",
        back_populates="teachers",
    )

    # --- Academias que este atleta GERENCIA (role=academy_manager ou admin) ---
    managed_academies: Mapped[list["Academy"]] = relationship(
        "Academy",
        back_populates="manager",
        foreign_keys="Academy.manager_id",
    )

    # --- Solicitações de graduação ---
    graduation_requests_made: Mapped[list["GraduationRequest"]] = relationship(
        "GraduationRequest",
        back_populates="requested_by",
        foreign_keys="GraduationRequest.requested_by_id",
    )
    graduation_requests_received: Mapped[list["GraduationRequest"]] = relationship(
        "GraduationRequest",
        back_populates="athlete",
        foreign_keys="GraduationRequest.athlete_id",
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
    def age(self) -> int | None:
        """Idade calculada a partir da data de nascimento."""
        if self.birth_date is None:
            return None
        today = date.today()
        years = today.year - self.birth_date.year
        # ajuste se ainda não fez aniversário este ano
        if (today.month, today.day) < (self.birth_date.month, self.birth_date.day):
            years -= 1
        return years

    @property
    def is_dan_rank(self) -> bool:
        return "Dan" in self.graduation

    @property
    def is_admin(self) -> bool:
        return self.role == AthleteRole.admin

    @property
    def is_teacher(self) -> bool:
        """Pode ensinar (role=teacher ou manager ou admin)."""
        return self.role in (
            AthleteRole.teacher,
            AthleteRole.academy_manager,
            AthleteRole.admin,
        )

    @property
    def is_academy_manager(self) -> bool:
        return self.role in (AthleteRole.academy_manager, AthleteRole.admin)

    # ------------------------------------------------------------------
    # Regras de permissão
    # ------------------------------------------------------------------
    def teaches_at(self, academy: "Academy") -> bool:
        """True se este atleta ensina na academia."""
        return any(a.id == academy.id for a in self.teaching_at)

    def manages(self, academy: "Academy") -> bool:
        """True se gerencia a academia (é manager dela OU admin)."""
        if self.is_admin:
            return True
        return any(a.id == academy.id for a in self.managed_academies)

    def can_edit_athlete_basic(self, other: "Athlete") -> bool:
        """Pode editar dados BÁSICOS (nome, email, telefone, peso...) do atleta.

        - Admin: sempre
        - O próprio atleta
        - Manager da academia do atleta
        - Professor individual do atleta (se for teacher ou acima)
        """
        if self.is_admin:
            return True
        if self.id == other.id:
            return True
        # Manager da home_academy
        if (
            self.is_academy_manager
            and other.home_academy_id is not None
            and any(a.id == other.home_academy_id for a in self.managed_academies)
        ):
            return True
        # Professor individual
        if self.is_teacher and other.professor_id == self.id:
            return True
        return False

    def can_request_graduation_change(self, other: "Athlete") -> bool:
        """Pode SOLICITAR mudança de graduação do atleta.

        - Admin: pode alterar direto (não precisa solicitar, mas tem a permissão)
        - Professor individual do atleta
        - Manager da academia do atleta
        """
        if self.is_admin:
            return True
        if self.is_teacher and other.professor_id == self.id:
            return True
        if (
            self.is_academy_manager
            and other.home_academy_id is not None
            and any(a.id == other.home_academy_id for a in self.managed_academies)
        ):
            return True
        return False

    def can_approve_graduation(self) -> bool:
        """Quem pode APROVAR/rejeitar pedidos de graduação — só admin."""
        return self.is_admin


# Índices pra busca rápida
Index("ix_athletes_email", Athlete.email)
