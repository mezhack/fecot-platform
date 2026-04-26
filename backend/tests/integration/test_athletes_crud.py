"""Testes do CRUD de atletas (create, update, delete).

Regras testadas:
- Admin pode criar atletas
- Teacher também
- Atleta comum não pode criar (já é regra teacher_or_above)
- Update não aceita graduation (precisa fluxo de GraduationRequest)
- Teacher só pode editar atletas seus
- Apenas admin deleta
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.athlete import AthleteRole
from tests.factories import (
    login_as,
    make_academy,
    make_admin,
    make_athlete,
    make_manager,
    make_teacher,
)


class TestCreateAthlete:
    def test_admin_cria_atleta_basico(self, client, db_session: Session):
        admin = make_admin(db_session)
        headers = login_as(client, admin.email)

        resp = client.post(
            "/api/athletes",
            headers=headers,
            json={
                "name": "Novo Atleta",
                "cpf": "12345678901",
                "email": "novo@test.com",
                "graduation": "5º Gub",
                "role": "athlete",
                "birth_date": "2000-01-01",
                "weight_kg": 70,
                "sex": "male",
            },
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["name"] == "Novo Atleta"
        assert data["graduation"] == "5º Gub"
        assert data["role"] == "athlete"

    def test_teacher_pode_criar_atleta(self, client, db_session: Session):
        teacher = make_teacher(db_session)
        headers = login_as(client, teacher.email)

        resp = client.post(
            "/api/athletes",
            headers=headers,
            json={
                "name": "Aluno Novo",
                "cpf": "11111111111",
                "graduation": "8º Gub",
                "role": "athlete",
            },
        )
        assert resp.status_code == 201

    def test_atleta_comum_nao_pode_criar(self, client, db_session: Session):
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        resp = client.post(
            "/api/athletes",
            headers=headers,
            json={
                "name": "X",
                "cpf": "22222222222",
                "graduation": "5º Gub",
                "role": "athlete",
            },
        )
        assert resp.status_code == 403

    def test_criar_teacher_com_graduacao_gub_falha(
        self, client, db_session: Session
    ):
        """Teacher precisa ter ≥ 1º Dan."""
        admin = make_admin(db_session)
        headers = login_as(client, admin.email)

        resp = client.post(
            "/api/athletes",
            headers=headers,
            json={
                "name": "Falso Professor",
                "cpf": "33333333333",
                "graduation": "1º Gub",  # não pode ser teacher
                "role": "teacher",
            },
        )
        assert resp.status_code == 422

    def test_criar_manager_com_graduacao_gub_falha(
        self, client, db_session: Session
    ):
        admin = make_admin(db_session)
        headers = login_as(client, admin.email)

        resp = client.post(
            "/api/athletes",
            headers=headers,
            json={
                "name": "Falso Gestor",
                "cpf": "44444444444",
                "graduation": "1º Gub",
                "role": "academy_manager",
            },
        )
        assert resp.status_code == 422

    def test_email_duplicado_retorna_409(self, client, db_session: Session):
        admin = make_admin(db_session)
        existente = make_athlete(db_session)
        headers = login_as(client, admin.email)

        resp = client.post(
            "/api/athletes",
            headers=headers,
            json={
                "name": "Outro",
                "email": existente.email,  # duplicado
                "cpf": "55555555555",
                "graduation": "5º Gub",
                "role": "athlete",
            },
        )
        assert resp.status_code == 409


class TestUpdateAthlete:
    def test_admin_atualiza_dados_basicos(self, client, db_session: Session):
        admin = make_admin(db_session)
        target = make_athlete(db_session, name="Original")
        headers = login_as(client, admin.email)

        resp = client.patch(
            f"/api/athletes/{target.id}",
            headers=headers,
            json={"name": "Atualizado", "weight_kg": 80},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Atualizado"
        assert data["weight_kg"] == 80

    def test_graduacao_nao_eh_alterada_via_patch_athletes(
        self, client, db_session: Session
    ):
        """Mesmo admin NÃO pode alterar graduação direto via PATCH /api/athletes/{id}.
        
        Toda mudança de graduação passa pelo fluxo de GraduationRequest.
        Isso é uma decisão de segurança: rastreabilidade total das mudanças.
        """
        admin = make_admin(db_session)
        target = make_athlete(db_session, graduation="5º Gub")
        headers = login_as(client, admin.email)

        resp = client.patch(
            f"/api/athletes/{target.id}",
            headers=headers,
            json={"graduation": "3º Gub"},
        )
        assert resp.status_code == 200
        # Graduação NÃO deve ter mudado — campo é silenciosamente ignorado
        assert resp.json()["graduation"] == "5º Gub"

    def test_teacher_edita_aluno_seu(self, client, db_session: Session):
        teacher = make_teacher(db_session)
        aluno = make_athlete(db_session, professor=teacher)
        headers = login_as(client, teacher.email)

        resp = client.patch(
            f"/api/athletes/{aluno.id}",
            headers=headers,
            json={"weight_kg": 78},
        )
        assert resp.status_code == 200

    def test_teacher_nao_edita_aluno_de_outro(
        self, client, db_session: Session
    ):
        teacher_a = make_teacher(db_session)
        teacher_b = make_teacher(db_session)
        # aluno é do teacher_b
        aluno = make_athlete(db_session, professor=teacher_b)

        headers = login_as(client, teacher_a.email)
        resp = client.patch(
            f"/api/athletes/{aluno.id}",
            headers=headers,
            json={"name": "Hackeado"},
        )
        assert resp.status_code == 403


class TestDeleteAthlete:
    def test_admin_deleta_atleta_orfao(self, client, db_session: Session):
        admin = make_admin(db_session)
        target = make_athlete(db_session)
        headers = login_as(client, admin.email)

        resp = client.delete(f"/api/athletes/{target.id}", headers=headers)
        assert resp.status_code == 204

        # Confirma que foi deletado
        get_resp = client.get(f"/api/athletes/{target.id}", headers=headers)
        assert get_resp.status_code == 404

    def test_nao_admin_nao_deleta(self, client, db_session: Session):
        teacher = make_teacher(db_session)
        target = make_athlete(db_session)
        headers = login_as(client, teacher.email)

        resp = client.delete(f"/api/athletes/{target.id}", headers=headers)
        assert resp.status_code == 403
