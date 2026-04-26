"""Smoke test pra validar que o conftest sobe o ambiente corretamente."""
from __future__ import annotations

from sqlalchemy.orm import Session

from tests.factories import make_admin


def test_db_session_works(db_session: Session):
    """A sessão de banco existe e aceita queries."""
    from sqlalchemy import text

    result = db_session.execute(text("SELECT 1")).scalar()
    assert result == 1


def test_can_create_admin(db_session: Session):
    """Factory de admin funciona — confirma que migrations rodaram."""
    admin = make_admin(db_session)
    assert admin.id is not None
    assert admin.email is not None
    assert admin.role.value == "admin"


def test_health_endpoint(client):
    """API responde no endpoint público."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["database"] == "ok"
