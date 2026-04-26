"""Fixtures compartilhadas pra todos os testes.

Estratégia:
- Cada execução do pytest cria um banco TEMPORÁRIO (`fecot_test_{uuid}`)
- Roda migrations Alembic nele
- Cada teste recebe uma sessão isolada
- No fim de TODOS os testes, dropa o banco
- Pra isolar testes entre si, cada teste roda em uma transação que faz rollback no fim
  (mas como nosso código faz `db.commit()` em endpoints, usamos truncate de tabelas).

Esse setup é mais lento que SQLite, mas usa o MESMO banco da produção
(Postgres), então pegamos bugs reais (tipos, constraints, índices, JSONB).
"""
from __future__ import annotations

import os
import uuid
from collections.abc import Generator, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

# IMPORTANTE: configuramos as env vars ANTES de importar app/*
# senão o settings.py do app trava no DATABASE_URL real.

_ROOT = Path(__file__).resolve().parent.parent  # /backend
_TEMPLATE_DB = "fecot_test_template"
_TEST_DB = f"fecot_test_{uuid.uuid4().hex[:8]}"

# Permite override via env (CI usa). Default = postgres local.
_PG_BASE_URL = os.environ.get(
    "TEST_DATABASE_URL_BASE",
    "postgresql+psycopg2://fecot:fecot@localhost:5432",
)

os.environ["DATABASE_URL"] = f"{_PG_BASE_URL}/{_TEST_DB}"
os.environ["JWT_SECRET"] = "test-secret-for-pytest-only-do-not-use-in-production-1234567890"
os.environ["APP_ENV"] = "testing"
os.environ["UPLOAD_DIR"] = str(_ROOT / "tests" / ".uploads_tmp")
os.environ["UPLOAD_PUBLIC_PREFIX"] = "/uploads"
os.environ["AVATAR_MAX_MB"] = "5"
os.environ["AVATAR_MAX_SIZE"] = "512"
os.environ["CORS_ORIGINS"] = "http://test.local"

from app.core.config import settings  # noqa: E402
from app.db.session import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402


# ---------------------------------------------------------------------------
# Setup do banco — uma vez por sessão de testes
# ---------------------------------------------------------------------------

def _create_test_db() -> None:
    """Conecta ao banco 'postgres' default e cria o banco de teste."""
    admin_engine = create_engine(f"{_PG_BASE_URL}/postgres", isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        # Garante que não existe (caso execução anterior tenha falhado)
        conn.execute(text(f'DROP DATABASE IF EXISTS "{_TEST_DB}"'))
        conn.execute(text(f'CREATE DATABASE "{_TEST_DB}"'))
    admin_engine.dispose()


def _drop_test_db() -> None:
    admin_engine = create_engine(f"{_PG_BASE_URL}/postgres", isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        # Mata conexões abertas (pode haver pool ainda)
        conn.execute(
            text(
                f"""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = '{_TEST_DB}' AND pid <> pg_backend_pid()
                """
            )
        )
        conn.execute(text(f'DROP DATABASE IF EXISTS "{_TEST_DB}"'))
    admin_engine.dispose()


@pytest.fixture(scope="session")
def engine() -> Generator[Engine, None, None]:
    """Cria engine + schema do banco. Vive durante toda a sessão de testes."""
    _create_test_db()
    eng = create_engine(settings.database_url, future=True)

    # Cria todas as tabelas a partir do metadata (mais rápido e confiável que
    # rodar migrations Alembic em testes — a verdade do schema está nos models).
    # Importa todos os models pra registrar no Base.metadata.
    from app.models import academy, athlete, graduation_request  # noqa: F401

    Base.metadata.create_all(bind=eng)
    yield eng
    eng.dispose()
    _drop_test_db()


@pytest.fixture(scope="function")
def db_session(engine: Engine) -> Iterator[Session]:
    """Sessão de banco por teste, com truncate ao fim pra isolar entre testes."""
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Truncate todas as tabelas — mais rápido que DROP+CREATE
        with engine.connect() as conn:
            conn.execute(
                text(
                    """
                    TRUNCATE TABLE
                        academy_teachers,
                        graduation_requests,
                        athletes,
                        academies
                    RESTART IDENTITY CASCADE
                    """
                )
            )
            conn.commit()


# ---------------------------------------------------------------------------
# Cliente HTTP de teste
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def client(db_session: Session) -> Iterator[TestClient]:
    """TestClient do FastAPI com get_db sobrescrito pra usar a sessão de teste."""

    def override_get_db():
        # IMPORTANTE: cada request HTTP recebe uma sessão NOVA criada do mesmo engine,
        # senão ela pisa na sessão do teste e dá erro de "session already attached".
        SessionLocal = sessionmaker(
            bind=db_session.get_bind(), autocommit=False, autoflush=False, future=True
        )
        s = SessionLocal()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Limpeza de uploads
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _clean_uploads():
    """Limpa a pasta de uploads antes e depois de cada teste."""
    upload_dir = Path(settings.upload_dir) / "avatars"
    upload_dir.mkdir(parents=True, exist_ok=True)
    for f in upload_dir.glob("*"):
        if f.is_file():
            f.unlink()
    yield
    for f in upload_dir.glob("*"):
        if f.is_file():
            f.unlink()
