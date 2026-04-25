"""Schemas Pydantic de Academy."""
from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

CNPJ_DIGITS_RE = re.compile(r"^\d{14}$")


def _normalize_cnpj(v: str | None) -> str | None:
    if v is None:
        return None
    digits = re.sub(r"\D", "", v)
    return digits or None


class AcademyBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    cnpj: str | None = None

    address: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=2)
    zip_code: str | None = Field(None, max_length=10)

    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)

    phone: str | None = Field(None, max_length=32)
    email: EmailStr | None = None

    active: bool = True

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj(cls, v: str | None) -> str | None:
        normalized = _normalize_cnpj(v)
        if normalized is None:
            return None
        if not CNPJ_DIGITS_RE.match(normalized):
            raise ValueError("CNPJ deve conter 14 dígitos")
        return normalized


class AcademyCreate(AcademyBase):
    manager_id: int = Field(description="ID do atleta gestor (precisa ser ≥ 1º Dan)")


class AcademyUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    cnpj: str | None = None
    address: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=2)
    zip_code: str | None = Field(None, max_length=10)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    phone: str | None = Field(None, max_length=32)
    email: EmailStr | None = None
    active: bool | None = None
    manager_id: int | None = None

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj(cls, v: str | None) -> str | None:
        if v is None:
            return None
        normalized = _normalize_cnpj(v)
        if normalized and not CNPJ_DIGITS_RE.match(normalized):
            raise ValueError("CNPJ deve conter 14 dígitos")
        return normalized


class AcademyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    cnpj: str | None
    address: str | None
    city: str | None
    state: str | None
    zip_code: str | None
    latitude: float | None
    longitude: float | None
    phone: str | None
    email: str | None
    active: bool
    manager_id: int
    created_at: datetime
    updated_at: datetime

    # Derivados
    manager_name: str | None = None
    manager_contact: str | None = None
    students_count: int = 0
    teachers_count: int = 0
    teacher_ids: list[int] = Field(default_factory=list)

    @classmethod
    def from_model(cls, a) -> "AcademyRead":  # noqa: ANN001
        return cls(
            id=a.id,
            name=a.name,
            cnpj=a.cnpj,
            address=a.address,
            city=a.city,
            state=a.state,
            zip_code=a.zip_code,
            latitude=a.latitude,
            longitude=a.longitude,
            phone=a.phone,
            email=a.email,
            active=a.active,
            manager_id=a.manager_id,
            created_at=a.created_at,
            updated_at=a.updated_at,
            manager_name=a.manager_name,
            manager_contact=a.manager_contact,
            students_count=a.students_count,
            teachers_count=a.teachers_count,
            teacher_ids=[t.id for t in (a.teachers or [])],
        )


# Payload para associar/desassociar professor a uma academia
class AcademyTeacherLink(BaseModel):
    athlete_id: int
