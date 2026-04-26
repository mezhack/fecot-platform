"""Testes de academias.

Regras testadas:
- Admin cria academias
- Não-admin não cria
- Manager edita SUA academia
- Outros não editam academias alheias
- N:N professor-academia: adicionar e remover
- /api/academies/public/map é público (sem auth)
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from tests.factories import (
    login_as,
    make_academy,
    make_admin,
    make_athlete,
    make_manager,
    make_teacher,
)


class TestCreateAcademy:
    def test_admin_cria_academia(self, client, db_session: Session):
        admin = make_admin(db_session)
        manager = make_manager(db_session)
        headers = login_as(client, admin.email)

        resp = client.post(
            "/api/academies",
            headers=headers,
            json={
                "name": "Nova Academia",
                "manager_id": manager.id,
                "city": "Goiânia",
                "state": "GO",
            },
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["name"] == "Nova Academia"
        assert data["manager_id"] == manager.id

    def test_teacher_nao_cria(self, client, db_session: Session):
        teacher = make_teacher(db_session)
        manager = make_manager(db_session)
        headers = login_as(client, teacher.email)

        resp = client.post(
            "/api/academies",
            headers=headers,
            json={"name": "X", "manager_id": manager.id},
        )
        assert resp.status_code == 403

    def test_manager_com_grad_gub_invalida(self, client, db_session: Session):
        """Manager precisa ter graduação Dan."""
        admin = make_admin(db_session)
        # Cria um athlete (não Dan) e tenta usar como manager
        not_dan = make_athlete(db_session, graduation="5º Gub")
        headers = login_as(client, admin.email)

        resp = client.post(
            "/api/academies",
            headers=headers,
            json={"name": "X", "manager_id": not_dan.id},
        )
        # Não passa porque o atleta nem tem role academy_manager
        assert resp.status_code in (400, 422)


class TestUpdateAcademy:
    def test_manager_edita_propria(self, client, db_session: Session):
        manager = make_manager(db_session)
        academy = make_academy(db_session, manager=manager)
        headers = login_as(client, manager.email)

        resp = client.patch(
            f"/api/academies/{academy.id}",
            headers=headers,
            json={"city": "Brasília"},
        )
        assert resp.status_code == 200
        assert resp.json()["city"] == "Brasília"

    def test_manager_nao_edita_de_outro(self, client, db_session: Session):
        """Manager A NÃO pode editar academia do Manager B (apenas a própria)."""
        manager_a = make_manager(db_session)
        manager_b = make_manager(db_session)
        academy_b = make_academy(db_session, manager=manager_b)

        headers = login_as(client, manager_a.email)
        resp = client.patch(
            f"/api/academies/{academy_b.id}",
            headers=headers,
            json={"city": "Tentativa"},
        )
        assert resp.status_code == 403

    def test_admin_edita_qualquer(self, client, db_session: Session):
        admin = make_admin(db_session)
        manager = make_manager(db_session)
        academy = make_academy(db_session, manager=manager)
        headers = login_as(client, admin.email)

        resp = client.patch(
            f"/api/academies/{academy.id}",
            headers=headers,
            json={"name": "Renomeada"},
        )
        assert resp.status_code == 200


class TestTeachersAssociation:
    def test_adicionar_professor(self, client, db_session: Session):
        admin = make_admin(db_session)
        manager = make_manager(db_session)
        academy = make_academy(db_session, manager=manager)
        teacher = make_teacher(db_session)
        headers = login_as(client, admin.email)

        resp = client.post(
            f"/api/academies/{academy.id}/teachers",
            headers=headers,
            json={"athlete_id": teacher.id},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert teacher.id in data["teacher_ids"]

    def test_remover_professor(self, client, db_session: Session):
        admin = make_admin(db_session)
        manager = make_manager(db_session)
        academy = make_academy(db_session, manager=manager)
        teacher = make_teacher(db_session)
        headers = login_as(client, admin.email)

        # adiciona primeiro
        client.post(
            f"/api/academies/{academy.id}/teachers",
            headers=headers,
            json={"athlete_id": teacher.id},
        )
        # remove
        resp = client.delete(
            f"/api/academies/{academy.id}/teachers/{teacher.id}",
            headers=headers,
        )
        assert resp.status_code in (200, 204)

    def test_manager_nao_associa_professor_em_academia_alheia(
        self, client, db_session: Session
    ):
        """Manager A não pode associar professor à academia do Manager B."""
        manager_a = make_manager(db_session)
        manager_b = make_manager(db_session)
        academy_b = make_academy(db_session, manager=manager_b)
        teacher = make_teacher(db_session)

        headers = login_as(client, manager_a.email)
        resp = client.post(
            f"/api/academies/{academy_b.id}/teachers",
            headers=headers,
            json={"athlete_id": teacher.id},
        )
        assert resp.status_code == 403

    def test_manager_pode_gerenciar_propria_academia(
        self, client, db_session: Session
    ):
        """Manager pode adicionar professor à SUA academia."""
        manager = make_manager(db_session)
        academy = make_academy(db_session, manager=manager)
        teacher = make_teacher(db_session)

        headers = login_as(client, manager.email)
        resp = client.post(
            f"/api/academies/{academy.id}/teachers",
            headers=headers,
            json={"athlete_id": teacher.id},
        )
        assert resp.status_code == 200


class TestPublicMap:
    def test_mapa_publico_sem_auth(self, client, db_session: Session):
        manager = make_manager(db_session)
        # Mapa público só lista academias com lat/lng definidos
        ac1 = make_academy(db_session, manager=manager)
        ac2 = make_academy(db_session, manager=manager)
        ac1.latitude = -15.78
        ac1.longitude = -47.92
        ac2.latitude = -16.68
        ac2.longitude = -49.26
        db_session.commit()

        # Sem header de Authorization
        resp = client.get("/api/academies/public/map")
        assert resp.status_code == 200
        assert len(resp.json()) >= 2

    def test_academia_sem_coordenadas_nao_aparece_no_mapa(
        self, client, db_session: Session
    ):
        manager = make_manager(db_session)
        # Esta NÃO tem lat/lng — não deve aparecer
        make_academy(db_session, manager=manager)

        resp = client.get("/api/academies/public/map")
        assert resp.status_code == 200
        assert len(resp.json()) == 0
