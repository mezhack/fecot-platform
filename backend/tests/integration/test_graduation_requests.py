"""Testes do fluxo de solicitação de mudança de graduação.

Regras testadas:
- Quem pode CRIAR: admin, manager da academia, professor individual do atleta
- Quem pode APROVAR/REJEITAR: SOMENTE admin
- Atleta comum NÃO pode criar nem aprovar
- Aprovar muda a graduação do atleta automaticamente
- Rejeitar NÃO muda a graduação
- Não permite 2 requests pendentes simultâneos pro mesmo atleta
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.graduation_request import GraduationRequestStatus
from tests.factories import (
    login_as,
    make_academy,
    make_admin,
    make_athlete,
    make_graduation_request,
    make_manager,
    make_teacher,
)


class TestCreateRequest:
    def test_professor_responsavel_cria_request(self, client, db_session: Session):
        teacher = make_teacher(db_session)
        aluno = make_athlete(
            db_session, graduation="5º Gub", professor=teacher
        )
        headers = login_as(client, teacher.email)

        resp = client.post(
            "/api/graduation_requests",
            headers=headers,
            json={
                "athlete_id": aluno.id,
                "to_graduation": "4º Gub",
                "reason": "Evolução técnica",
            },
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["athlete_id"] == aluno.id
        assert data["from_graduation"] == "5º Gub"
        assert data["to_graduation"] == "4º Gub"
        assert data["status"] == "pending"
        assert data["requested_by_id"] == teacher.id

    def test_admin_pode_criar_qualquer_request(self, client, db_session: Session):
        admin = make_admin(db_session)
        aluno = make_athlete(db_session, graduation="5º Gub")
        headers = login_as(client, admin.email)

        resp = client.post(
            "/api/graduation_requests",
            headers=headers,
            json={"athlete_id": aluno.id, "to_graduation": "4º Gub"},
        )
        assert resp.status_code == 201

    def test_atleta_comum_nao_cria(self, client, db_session: Session):
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        resp = client.post(
            "/api/graduation_requests",
            headers=headers,
            json={"athlete_id": athlete.id, "to_graduation": "4º Gub"},
        )
        assert resp.status_code == 403

    def test_request_duplicada_retorna_409(self, client, db_session: Session):
        teacher = make_teacher(db_session)
        aluno = make_athlete(db_session, professor=teacher)
        # Já existe uma pending
        make_graduation_request(
            db_session,
            athlete=aluno,
            requested_by=teacher,
            to_graduation="4º Gub",
        )

        headers = login_as(client, teacher.email)
        resp = client.post(
            "/api/graduation_requests",
            headers=headers,
            json={"athlete_id": aluno.id, "to_graduation": "3º Gub"},
        )
        assert resp.status_code == 409

    def test_to_graduation_invalida_retorna_422(self, client, db_session: Session):
        admin = make_admin(db_session)
        aluno = make_athlete(db_session)
        headers = login_as(client, admin.email)

        resp = client.post(
            "/api/graduation_requests",
            headers=headers,
            json={"athlete_id": aluno.id, "to_graduation": "Faixa Roxa"},
        )
        assert resp.status_code == 422


class TestApproveReject:
    def test_admin_aprova_e_graduacao_muda(self, client, db_session: Session):
        admin = make_admin(db_session)
        teacher = make_teacher(db_session)
        aluno = make_athlete(db_session, graduation="5º Gub", professor=teacher)
        req = make_graduation_request(
            db_session,
            athlete=aluno,
            requested_by=teacher,
            to_graduation="4º Gub",
        )

        headers = login_as(client, admin.email)
        resp = client.post(
            f"/api/graduation_requests/{req.id}/approve",
            headers=headers,
            json={"review_notes": "OK, parabéns"},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["status"] == "approved"
        assert data["reviewed_by_id"] == admin.id
        assert data["reviewed_by_name"] == admin.name

        # Confirma que graduação do aluno mudou
        db_session.refresh(aluno)
        assert aluno.graduation == "4º Gub"

    def test_admin_rejeita_e_graduacao_NAO_muda(
        self, client, db_session: Session
    ):
        admin = make_admin(db_session)
        teacher = make_teacher(db_session)
        aluno = make_athlete(db_session, graduation="5º Gub", professor=teacher)
        req = make_graduation_request(
            db_session, athlete=aluno, requested_by=teacher, to_graduation="4º Gub"
        )

        headers = login_as(client, admin.email)
        resp = client.post(
            f"/api/graduation_requests/{req.id}/reject",
            headers=headers,
            json={"review_notes": "Precisa mais treino"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"
        assert resp.json()["reviewed_by_name"] == admin.name

        # Graduação preservada
        db_session.refresh(aluno)
        assert aluno.graduation == "5º Gub"

    def test_teacher_nao_aprova(self, client, db_session: Session):
        teacher_solicitante = make_teacher(db_session)
        teacher_outro = make_teacher(db_session)
        aluno = make_athlete(db_session, professor=teacher_solicitante)
        req = make_graduation_request(
            db_session, athlete=aluno, requested_by=teacher_solicitante
        )

        headers = login_as(client, teacher_outro.email)
        resp = client.post(
            f"/api/graduation_requests/{req.id}/approve",
            headers=headers,
            json={},
        )
        assert resp.status_code == 403

    def test_atleta_nao_aprova_propria(self, client, db_session: Session):
        teacher = make_teacher(db_session)
        aluno = make_athlete(db_session, professor=teacher)
        req = make_graduation_request(
            db_session, athlete=aluno, requested_by=teacher
        )

        headers = login_as(client, aluno.email)
        resp = client.post(
            f"/api/graduation_requests/{req.id}/approve",
            headers=headers,
            json={},
        )
        assert resp.status_code == 403


class TestListRequests:
    def test_admin_lista_todas(self, client, db_session: Session):
        admin = make_admin(db_session)
        teacher = make_teacher(db_session)
        a1 = make_athlete(db_session, professor=teacher)
        a2 = make_athlete(db_session, professor=teacher)
        make_graduation_request(db_session, athlete=a1, requested_by=teacher)
        make_graduation_request(db_session, athlete=a2, requested_by=teacher)

        headers = login_as(client, admin.email)
        resp = client.get("/api/graduation_requests", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_filtro_por_status(self, client, db_session: Session):
        admin = make_admin(db_session)
        teacher = make_teacher(db_session)
        a1 = make_athlete(db_session, professor=teacher)
        a2 = make_athlete(db_session, professor=teacher)
        make_graduation_request(
            db_session,
            athlete=a1,
            requested_by=teacher,
            status=GraduationRequestStatus.pending,
        )
        make_graduation_request(
            db_session,
            athlete=a2,
            requested_by=teacher,
            status=GraduationRequestStatus.approved,
        )

        headers = login_as(client, admin.email)
        resp = client.get(
            "/api/graduation_requests?status=pending", headers=headers
        )
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["status"] == "pending"
