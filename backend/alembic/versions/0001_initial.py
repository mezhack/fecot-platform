"""initial schema: athletes, academies, graduation_requests

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-24 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --------------------------------------------------------------
    # ATHLETES — criado primeiro sem FK pra academia (circular)
    # --------------------------------------------------------------
    op.create_table(
        "athletes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("cpf", sa.String(length=14), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column(
            "sex",
            sa.Enum("male", "female", name="athlete_sex"),
            nullable=True,
        ),
        sa.Column("graduation", sa.String(length=32), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "athlete",
                "teacher",
                "academy_manager",
                "admin",
                name="athlete_role",
            ),
            nullable=False,
            server_default="athlete",
        ),
        sa.Column("password_digest", sa.String(length=255), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("home_academy_id", sa.Integer(), nullable=True),
        sa.Column("professor_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("email", name="uq_athletes_email"),
        sa.UniqueConstraint("cpf", name="uq_athletes_cpf"),
    )
    op.create_index("ix_athletes_cpf", "athletes", ["cpf"])
    op.create_index("ix_athletes_email", "athletes", ["email"])

    # --------------------------------------------------------------
    # ACADEMIES
    # --------------------------------------------------------------
    op.create_table(
        "academies",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("cnpj", sa.String(length=18), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=2), nullable=True),
        sa.Column("zip_code", sa.String(length=10), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("manager_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("cnpj", name="uq_academies_cnpj"),
    )

    # --------------------------------------------------------------
    # FKs cruzadas
    # --------------------------------------------------------------
    op.create_foreign_key(
        "fk_athletes_home_academy_id",
        "athletes", "academies",
        ["home_academy_id"], ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_athletes_professor_id",
        "athletes", "athletes",
        ["professor_id"], ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_academies_manager_id",
        "academies", "athletes",
        ["manager_id"], ["id"],
        ondelete="RESTRICT",
    )

    # --------------------------------------------------------------
    # ACADEMY_TEACHERS (N:N)
    # --------------------------------------------------------------
    op.create_table(
        "academy_teachers",
        sa.Column(
            "academy_id",
            sa.Integer(),
            sa.ForeignKey("academies.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "athlete_id",
            sa.Integer(),
            sa.ForeignKey("athletes.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("academy_id", "athlete_id", name="uq_academy_teachers"),
    )

    # --------------------------------------------------------------
    # GRADUATION_REQUESTS
    # --------------------------------------------------------------
    op.create_table(
        "graduation_requests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("athlete_id", sa.Integer(), nullable=False),
        sa.Column("from_graduation", sa.String(length=32), nullable=False),
        sa.Column("to_graduation", sa.String(length=32), nullable=False),
        sa.Column("requested_by_id", sa.Integer(), nullable=False),
        sa.Column("reviewed_by_id", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", name="graduation_request_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["athlete_id"], ["athletes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by_id"], ["athletes.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["reviewed_by_id"], ["athletes.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_graduation_requests_status", "graduation_requests", ["status"])
    op.create_index("ix_graduation_requests_athlete_id", "graduation_requests", ["athlete_id"])


def downgrade() -> None:
    op.drop_index("ix_graduation_requests_athlete_id", table_name="graduation_requests")
    op.drop_index("ix_graduation_requests_status", table_name="graduation_requests")
    op.drop_table("graduation_requests")
    op.drop_table("academy_teachers")
    op.drop_constraint("fk_academies_manager_id", "academies", type_="foreignkey")
    op.drop_constraint("fk_athletes_professor_id", "athletes", type_="foreignkey")
    op.drop_constraint("fk_athletes_home_academy_id", "athletes", type_="foreignkey")
    op.drop_table("academies")
    op.drop_index("ix_athletes_email", table_name="athletes")
    op.drop_index("ix_athletes_cpf", table_name="athletes")
    op.drop_table("athletes")
    sa.Enum(name="graduation_request_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="athlete_role").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="athlete_sex").drop(op.get_bind(), checkfirst=True)
