"""Testes dos endpoints de autenticação."""
from __future__ import annotations

from sqlalchemy.orm import Session

from tests.factories import login_as, make_admin, make_athlete


class TestLogin:
    def test_login_com_email_funciona(self, client, db_session: Session):
        admin = make_admin(db_session, password="senha_forte")
        resp = client.post(
            "/api/login",
            json={"identifier": admin.email, "password": "senha_forte"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["athlete"]["id"] == admin.id
        assert data["athlete"]["email"] == admin.email

    def test_login_com_cpf_funciona(self, client, db_session: Session):
        admin = make_admin(db_session, password="abc123")
        resp = client.post(
            "/api/login",
            json={"identifier": admin.cpf, "password": "abc123"},
        )
        assert resp.status_code == 200
        assert resp.json()["athlete"]["id"] == admin.id

    def test_login_senha_errada_retorna_401(self, client, db_session: Session):
        admin = make_admin(db_session, password="correta")
        resp = client.post(
            "/api/login",
            json={"identifier": admin.email, "password": "errada"},
        )
        assert resp.status_code == 401

    def test_login_usuario_inexistente_retorna_401(self, client):
        resp = client.post(
            "/api/login",
            json={"identifier": "naoexiste@test.com", "password": "qq"},
        )
        assert resp.status_code == 401

    def test_token_retornado_funciona_em_endpoint_autenticado(
        self, client, db_session: Session
    ):
        admin = make_admin(db_session, password="senha")
        login_resp = client.post(
            "/api/login",
            json={"identifier": admin.email, "password": "senha"},
        )
        token = login_resp.json()["access_token"]

        # Usa o token em /api/me
        me_resp = client.get(
            "/api/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["id"] == admin.id


class TestMe:
    def test_me_sem_token_retorna_401(self, client):
        resp = client.get("/api/me")
        assert resp.status_code == 401

    def test_me_com_token_invalido_retorna_401(self, client):
        resp = client.get(
            "/api/me",
            headers={"Authorization": "Bearer token.fake.aqui"},
        )
        assert resp.status_code == 401

    def test_me_retorna_dados_do_atleta_logado(self, client, db_session: Session):
        admin = make_admin(db_session, name="Joana Admin")
        headers = login_as(client, admin.email)

        resp = client.get("/api/me", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == admin.id
        assert data["name"] == "Joana Admin"
        assert data["role"] == "admin"


class TestUpdatePassword:
    def test_troca_senha_com_sucesso(self, client, db_session: Session):
        athlete = make_athlete(db_session, password="senha_antiga")
        headers = login_as(client, athlete.email, password="senha_antiga")

        resp = client.patch(
            "/api/update_password",
            headers=headers,
            json={"current_password": "senha_antiga", "new_password": "senha_nova_123"},
        )
        assert resp.status_code == 204

        # Senha antiga não funciona mais
        old_login = client.post(
            "/api/login",
            json={"identifier": athlete.email, "password": "senha_antiga"},
        )
        assert old_login.status_code == 401

        # Senha nova funciona
        new_login = client.post(
            "/api/login",
            json={"identifier": athlete.email, "password": "senha_nova_123"},
        )
        assert new_login.status_code == 200

    def test_senha_atual_errada_retorna_401(self, client, db_session: Session):
        athlete = make_athlete(db_session, password="atual")
        headers = login_as(client, athlete.email, password="atual")

        resp = client.patch(
            "/api/update_password",
            headers=headers,
            json={"current_password": "errada", "new_password": "nova_senha_valida"},
        )
        assert resp.status_code == 401

    def test_nova_senha_muito_curta_retorna_422(self, client, db_session: Session):
        athlete = make_athlete(db_session, password="atual")
        headers = login_as(client, athlete.email, password="atual")

        resp = client.patch(
            "/api/update_password",
            headers=headers,
            json={"current_password": "atual", "new_password": "abc"},  # < 6 chars
        )
        assert resp.status_code == 422
