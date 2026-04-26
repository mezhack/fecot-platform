"""Testes do PATCH /api/me — auto-edição de dados pessoais.

Esses testes verificam que:
- Atleta pode editar seus próprios dados pessoais (nome, email, etc)
- Mas NÃO pode editar role, graduation, academia, professor (federativos)
- Email duplicado retorna 409
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.academy import Academy
from app.models.athlete import Athlete, AthleteRole
from tests.factories import login_as, make_admin, make_athlete


class TestSelfEdit:
    def test_atleta_pode_atualizar_nome_email_telefone(
        self, client, db_session: Session
    ):
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        resp = client.patch(
            "/api/me",
            headers=headers,
            json={
                "name": "Novo Nome",
                "email": "novo@test.com",
                "phone": "(61) 99999-9999",
                "weight_kg": 65.5,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Novo Nome"
        assert data["email"] == "novo@test.com"
        assert data["phone"] == "(61) 99999-9999"
        assert data["weight_kg"] == 65.5

    def test_role_e_graduation_sao_ignorados(self, client, db_session: Session):
        """Mesmo enviando role/graduation no payload, eles devem ser ignorados."""
        athlete = make_athlete(db_session, graduation="5º Gub")
        headers = login_as(client, athlete.email)

        resp = client.patch(
            "/api/me",
            headers=headers,
            json={
                "role": "admin",  # tentativa de escalada
                "graduation": "10º Dan",  # tentativa de pular graduação
                "name": "Nome Editado",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        # Nome muda
        assert data["name"] == "Nome Editado"
        # Mas role e graduação NÃO mudam
        assert data["role"] == "athlete"
        assert data["graduation"] == "5º Gub"

    def test_email_duplicado_retorna_409(self, client, db_session: Session):
        athlete1 = make_athlete(db_session)
        athlete2 = make_athlete(db_session)
        headers = login_as(client, athlete2.email)

        resp = client.patch(
            "/api/me",
            headers=headers,
            json={"email": athlete1.email},
        )
        assert resp.status_code == 409

    def test_atleta_pode_manter_proprio_email(self, client, db_session: Session):
        """Edge case: enviar o próprio email não deve dar 409."""
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        resp = client.patch(
            "/api/me",
            headers=headers,
            json={"email": athlete.email, "name": "Novo Nome"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Novo Nome"

    def test_cpf_nao_pode_ser_alterado(self, client, db_session: Session):
        """CPF não está nem no schema do PATCH /api/me — deve ser ignorado."""
        athlete = make_athlete(db_session)
        original_cpf = athlete.cpf
        headers = login_as(client, athlete.email)

        resp = client.patch(
            "/api/me",
            headers=headers,
            json={"cpf": "99999999999"},  # tentativa
        )
        assert resp.status_code == 200
        # CPF preservado no banco
        db_session.refresh(athlete)
        assert athlete.cpf == original_cpf

    def test_data_nascimento_no_futuro_retorna_422(
        self, client, db_session: Session
    ):
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        resp = client.patch(
            "/api/me",
            headers=headers,
            json={"birth_date": "2099-01-01"},
        )
        assert resp.status_code == 422

    def test_atleta_atualiza_so_um_campo(self, client, db_session: Session):
        """Apenas o campo enviado deve mudar; outros permanecem."""
        athlete = make_athlete(db_session, name="Original")
        original_email = athlete.email
        headers = login_as(client, athlete.email)

        resp = client.patch(
            "/api/me",
            headers=headers,
            json={"name": "Mudado"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Mudado"
        assert data["email"] == original_email  # inalterado
