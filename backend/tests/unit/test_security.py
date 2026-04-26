"""Testes de segurança: hash de senha, ciclo verify, JWT."""
from __future__ import annotations

import pytest
from jose import jwt

from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


@pytest.mark.unit
class TestPasswordHashing:
    def test_hash_returns_different_string_than_input(self):
        h = hash_password("minha_senha")
        assert h != "minha_senha"
        assert len(h) > 30  # bcrypt produz strings longas

    def test_verify_correct_password(self):
        h = hash_password("senha123")
        assert verify_password("senha123", h) is True

    def test_verify_wrong_password(self):
        h = hash_password("senha123")
        assert verify_password("senha_errada", h) is False

    def test_hash_is_random(self):
        """Mesma senha deve gerar hashes diferentes (salt aleatório)."""
        h1 = hash_password("senha")
        h2 = hash_password("senha")
        assert h1 != h2
        # Mas ambos verificam corretamente
        assert verify_password("senha", h1) is True
        assert verify_password("senha", h2) is True


@pytest.mark.unit
class TestJWT:
    def test_create_and_decode_token(self):
        token = create_access_token(subject=123, extra_claims={"role": "admin"})
        payload = decode_token(token)
        assert payload is not None
        # sub é o id do atleta como string
        assert payload["sub"] == "123"
        assert payload["role"] == "admin"
        # tem expiração e issued at
        assert "exp" in payload
        assert "iat" in payload

    def test_token_with_invalid_signature_returns_none(self):
        token = create_access_token(subject=123)
        # Manipula um caractere — assinatura quebra
        tampered = token[:-5] + "XXXXX"
        assert decode_token(tampered) is None

    def test_expired_token_returns_none(self):
        # Cria token que já expirou
        from datetime import datetime, timedelta, timezone

        expired_payload = {
            "sub": "123",
            "exp": datetime.now(tz=timezone.utc) - timedelta(minutes=1),
        }
        token = jwt.encode(
            expired_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm
        )
        assert decode_token(token) is None

    def test_garbage_string_returns_none(self):
        assert decode_token("not.a.valid.token") is None
        assert decode_token("") is None
