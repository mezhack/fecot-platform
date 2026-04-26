"""Testes das permissões de GET /api/athletes e GET /api/athletes/{id}.

Regras testadas:
- Atleta comum: NÃO pode listar (403)
- Atleta comum: NÃO pode ver outros (403), só a si mesmo (200)
- Teacher/manager/admin: podem listar e ver qualquer um
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from tests.factories import login_as, make_admin, make_athlete, make_teacher


class TestListAthletes:
    def test_atleta_comum_recebe_403(self, client, db_session: Session):
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        resp = client.get("/api/athletes", headers=headers)
        assert resp.status_code == 403

    def test_admin_lista_todos(self, client, db_session: Session):
        admin = make_admin(db_session)
        make_athlete(db_session)
        make_athlete(db_session)
        make_teacher(db_session)

        headers = login_as(client, admin.email)
        resp = client.get("/api/athletes", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        # admin + 2 athletes + 1 teacher = 4
        assert len(data) == 4

    def test_teacher_pode_listar(self, client, db_session: Session):
        teacher = make_teacher(db_session)
        make_athlete(db_session)

        headers = login_as(client, teacher.email)
        resp = client.get("/api/athletes", headers=headers)
        assert resp.status_code == 200

    def test_filtro_por_role(self, client, db_session: Session):
        admin = make_admin(db_session)
        make_athlete(db_session)
        make_athlete(db_session)
        make_teacher(db_session)

        headers = login_as(client, admin.email)
        resp = client.get("/api/athletes?role=athlete", headers=headers)
        assert resp.status_code == 200
        roles = [a["role"] for a in resp.json()]
        assert all(r == "athlete" for r in roles)
        assert len(roles) == 2

    def test_filtro_por_search(self, client, db_session: Session):
        admin = make_admin(db_session)
        make_athlete(db_session, name="João Silva")
        make_athlete(db_session, name="Maria Santos")

        headers = login_as(client, admin.email)
        resp = client.get("/api/athletes?search=Maria", headers=headers)
        assert resp.status_code == 200
        names = [a["name"] for a in resp.json()]
        assert "Maria Santos" in names
        assert "João Silva" not in names


class TestGetAthlete:
    def test_atleta_comum_pode_ver_a_si_mesmo(self, client, db_session: Session):
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        resp = client.get(f"/api/athletes/{athlete.id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == athlete.id

    def test_atleta_comum_nao_pode_ver_outro(self, client, db_session: Session):
        a1 = make_athlete(db_session)
        a2 = make_athlete(db_session)
        headers = login_as(client, a1.email)

        resp = client.get(f"/api/athletes/{a2.id}", headers=headers)
        assert resp.status_code == 403

    def test_admin_ve_qualquer_atleta(self, client, db_session: Session):
        admin = make_admin(db_session)
        outro = make_athlete(db_session)
        headers = login_as(client, admin.email)

        resp = client.get(f"/api/athletes/{outro.id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == outro.id

    def test_teacher_ve_qualquer_atleta(self, client, db_session: Session):
        teacher = make_teacher(db_session)
        outro = make_athlete(db_session)
        headers = login_as(client, teacher.email)

        resp = client.get(f"/api/athletes/{outro.id}", headers=headers)
        assert resp.status_code == 200

    def test_atleta_inexistente_retorna_404(self, client, db_session: Session):
        admin = make_admin(db_session)
        headers = login_as(client, admin.email)

        resp = client.get("/api/athletes/99999", headers=headers)
        assert resp.status_code == 404
