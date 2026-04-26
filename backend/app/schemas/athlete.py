"""Schemas Pydantic de Atleta (entrada e saída da API)."""
from __future__ import annotations

import re
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.graduations import GRADUATIONS, can_be_professor
from app.models.athlete import AthleteRole, AthleteSex

CPF_DIGITS_RE = re.compile(r"^\d{11}$")


def _normalize_cpf(v: str | None) -> str | None:
    if v is None:
        return None
    digits = re.sub(r"\D", "", v)
    return digits or None


# -------------------- Base --------------------

class AthleteBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr | None = None
    cpf: str | None = None
    phone: str | None = Field(None, max_length=32)

    birth_date: date | None = None
    weight_kg: float | None = Field(None, gt=0, lt=500)
    sex: AthleteSex | None = None

    graduation: str
    role: AthleteRole = AthleteRole.athlete

    home_academy_id: int | None = None
    professor_id: int | None = None
    active: bool = True
    avatar_url: str | None = Field(None, max_length=500)

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, v: str | None) -> str | None:
        normalized = _normalize_cpf(v)
        if normalized is None:
            return None
        if not CPF_DIGITS_RE.match(normalized):
            raise ValueError("CPF deve conter 11 dígitos")
        return normalized

    @field_validator("graduation")
    @classmethod
    def validate_graduation(cls, v: str) -> str:
        if v not in GRADUATIONS:
            raise ValueError(f"Graduação inválida. Use uma de: {', '.join(GRADUATIONS)}")
        return v

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, v: date | None) -> date | None:
        if v is not None and v > date.today():
            raise ValueError("Data de nascimento não pode estar no futuro")
        return v


# -------------------- Create --------------------

class AthleteCreate(AthleteBase):
    """Senha opcional. Se não vier mas houver CPF, o CPF é usado como senha inicial."""
    password: str | None = Field(None, min_length=6, max_length=128)


# -------------------- Update --------------------

class AthleteUpdate(BaseModel):
    """Todos os campos opcionais pra PATCH parcial.

    ATENÇÃO: `graduation` NÃO pode ser alterada por este endpoint, NEM MESMO
    POR ADMIN. Toda mudança de graduação passa pelo fluxo de GraduationRequest
    (POST /api/graduation_requests → aprovação por admin). Isso garante
    rastreabilidade total das mudanças (requested_by, reviewed_by, timestamps).
    """
    name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    cpf: str | None = None
    phone: str | None = Field(None, max_length=32)
    birth_date: date | None = None
    weight_kg: float | None = Field(None, gt=0, lt=500)
    sex: AthleteSex | None = None
    role: AthleteRole | None = None
    home_academy_id: int | None = None
    professor_id: int | None = None
    active: bool | None = None
    avatar_url: str | None = Field(None, max_length=500)
    password: str | None = Field(None, min_length=6, max_length=128)

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, v: str | None) -> str | None:
        if v is None:
            return None
        normalized = _normalize_cpf(v)
        if normalized and not CPF_DIGITS_RE.match(normalized):
            raise ValueError("CPF deve conter 11 dígitos")
        return normalized

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, v: date | None) -> date | None:
        if v is not None and v > date.today():
            raise ValueError("Data de nascimento não pode estar no futuro")
        return v


# -------------------- Response --------------------

class AthleteSummary(BaseModel):
    """Versão resumida — usada em listagens referenciadas."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    graduation: str


class AthleteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None
    cpf: str | None
    phone: str | None
    birth_date: date | None
    weight_kg: float | None
    sex: AthleteSex | None
    graduation: str
    role: AthleteRole
    active: bool
    avatar_url: str | None
    home_academy_id: int | None
    professor_id: int | None
    created_at: datetime
    updated_at: datetime

    # Derivados
    age: int | None = None
    home_academy_name: str | None = None
    professor_name: str | None = None
    is_dan_rank: bool = False
    can_be_professor: bool = False
    teaching_at_academy_ids: list[int] = Field(default_factory=list)

    @classmethod
    def from_model(cls, a) -> "AthleteRead":  # noqa: ANN001
        return cls(
            id=a.id,
            name=a.name,
            email=a.email,
            cpf=a.cpf,
            phone=a.phone,
            birth_date=a.birth_date,
            weight_kg=a.weight_kg,
            sex=a.sex,
            graduation=a.graduation,
            role=a.role,
            active=a.active,
            avatar_url=a.avatar_url,
            home_academy_id=a.home_academy_id,
            professor_id=a.professor_id,
            created_at=a.created_at,
            updated_at=a.updated_at,
            age=a.age,
            home_academy_name=a.home_academy.name if a.home_academy else None,
            professor_name=a.professor.name if a.professor else None,
            is_dan_rank=a.is_dan_rank,
            can_be_professor=can_be_professor(a.graduation),
            teaching_at_academy_ids=[ac.id for ac in (a.teaching_at or [])],
        )


# -------------------- Auth --------------------

class LoginRequest(BaseModel):
    identifier: str = Field(description="Email ou CPF")
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    athlete: AthleteRead


class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)


class SelfUpdateRequest(BaseModel):
    """Payload para PATCH /api/me — auto-edição de dados pessoais.

    Campos NÃO permitidos aqui (mudança federativa, precisa teacher/manager/admin):
    - graduation (fluxo de GraduationRequest)
    - role
    - home_academy_id
    - professor_id
    - active
    - cpf (imutável após cadastro)
    """
    name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=32)
    birth_date: date | None = None
    weight_kg: float | None = Field(None, gt=0, lt=500)
    sex: AthleteSex | None = None
    avatar_url: str | None = Field(None, max_length=500)

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, v: date | None) -> date | None:
        if v is not None and v > date.today():
            raise ValueError("Data de nascimento não pode estar no futuro")
        return v
