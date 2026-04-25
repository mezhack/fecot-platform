"""Registra todos os models para o metadata do SQLAlchemy."""
from app.models.academy import Academy
from app.models.academy_teacher import academy_teachers
from app.models.athlete import Athlete, AthleteRole, AthleteSex
from app.models.graduation_request import GraduationRequest, GraduationRequestStatus

__all__ = [
    "Academy",
    "Athlete",
    "AthleteRole",
    "AthleteSex",
    "GraduationRequest",
    "GraduationRequestStatus",
    "academy_teachers",
]
