"""Tabela de associação N:N entre Academy e Athlete.

Um professor (Athlete com role=teacher) pode ensinar em várias academias,
e uma academia pode ter vários professores.

Esta NÃO é uma classe Model — é só uma Table do SQLAlchemy usada pelo
relacionamento secondary.
"""
from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Table, UniqueConstraint, func

from app.db.session import Base

academy_teachers = Table(
    "academy_teachers",
    Base.metadata,
    Column("academy_id", Integer, ForeignKey("academies.id", ondelete="CASCADE"), primary_key=True),
    Column("athlete_id", Integer, ForeignKey("athletes.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
    UniqueConstraint("academy_id", "athlete_id", name="uq_academy_teachers"),
)
