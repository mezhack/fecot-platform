"""Factory functions pra criar entidades nos testes.

Não usei factory_boy puro porque temos dependências complexas
(athletes precisa academy criada antes, manager precisa graduação Dan, etc).
Funções diretas são mais simples e legíveis.
"""
from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.academy import Academy
from app.models.athlete import Athlete, AthleteRole, AthleteSex
from app.models.graduation_request import GraduationRequest, GraduationRequestStatus


# ---------------------------------------------------------------------------
# Counters pra gerar valores únicos sem colisão
# ---------------------------------------------------------------------------

class _Counter:
    """CPF único e email único entre testes."""
    n = 0

    @classmethod
    def next(cls) -> int:
        cls.n += 1
        return cls.n


def _next_cpf() -> str:
    """Gera string de 11 dígitos única (não é CPF válido pelo algoritmo,
    mas o nosso schema só checa formato, não verificador)."""
    return str(10000000000 + _Counter.next()).zfill(11)


# ---------------------------------------------------------------------------
# Factories
# ---------------------------------------------------------------------------

def make_admin(
    db: Session,
    *,
    name: str = "Admin Teste",
    email: str | None = None,
    password: str = "senha123",
) -> Athlete:
    n = _Counter.next()
    a = Athlete(
        name=name,
        email=email or f"admin{n}@test.com",
        cpf=_next_cpf(),
        graduation="5º Dan",
        role=AthleteRole.admin,
        birth_date=date(1980, 1, 1),
        weight_kg=80.0,
        sex=AthleteSex.male,
        password_digest=hash_password(password),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def make_academy(
    db: Session,
    *,
    name: str = "Academia Teste",
    manager: Athlete | None = None,
    db_admin: Athlete | None = None,
) -> Academy:
    """Cria academia. Se não for passado manager, cria um admin pra ser manager."""
    if manager is None:
        manager = db_admin or make_admin(db)

    n = _Counter.next()
    ac = Academy(
        name=f"{name} {n}",
        cnpj=f"00.000.000/000{n:01d}-00"[:18],
        city="Brasília",
        state="DF",
        manager_id=manager.id,
    )
    db.add(ac)
    db.commit()
    db.refresh(ac)
    return ac


def make_teacher(
    db: Session,
    *,
    name: str = "Professor Teste",
    graduation: str = "2º Dan",
    home_academy: Academy | None = None,
    password: str = "senha123",
) -> Athlete:
    n = _Counter.next()
    a = Athlete(
        name=name,
        email=f"teacher{n}@test.com",
        cpf=_next_cpf(),
        graduation=graduation,
        role=AthleteRole.teacher,
        birth_date=date(1990, 1, 1),
        weight_kg=75.0,
        sex=AthleteSex.male,
        home_academy_id=home_academy.id if home_academy else None,
        password_digest=hash_password(password),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def make_athlete(
    db: Session,
    *,
    name: str = "Aluno Teste",
    graduation: str = "5º Gub",
    home_academy: Academy | None = None,
    professor: Athlete | None = None,
    password: str = "senha123",
    sex: AthleteSex = AthleteSex.male,
    birth_date: date = date(2000, 6, 15),
    weight_kg: float = 70.0,
) -> Athlete:
    n = _Counter.next()
    a = Athlete(
        name=name,
        email=f"aluno{n}@test.com",
        cpf=_next_cpf(),
        graduation=graduation,
        role=AthleteRole.athlete,
        birth_date=birth_date,
        weight_kg=weight_kg,
        sex=sex,
        home_academy_id=home_academy.id if home_academy else None,
        professor_id=professor.id if professor else None,
        password_digest=hash_password(password),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def make_manager(
    db: Session,
    *,
    name: str = "Gestor Teste",
    graduation: str = "3º Dan",
    home_academy: Academy | None = None,
    password: str = "senha123",
) -> Athlete:
    n = _Counter.next()
    a = Athlete(
        name=name,
        email=f"manager{n}@test.com",
        cpf=_next_cpf(),
        graduation=graduation,
        role=AthleteRole.academy_manager,
        birth_date=date(1985, 1, 1),
        weight_kg=80.0,
        sex=AthleteSex.male,
        home_academy_id=home_academy.id if home_academy else None,
        password_digest=hash_password(password),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def make_graduation_request(
    db: Session,
    *,
    athlete: Athlete,
    requested_by: Athlete,
    to_graduation: str = "4º Gub",
    status: GraduationRequestStatus = GraduationRequestStatus.pending,
    reason: str | None = None,
) -> GraduationRequest:
    req = GraduationRequest(
        athlete_id=athlete.id,
        from_graduation=athlete.graduation,
        to_graduation=to_graduation,
        requested_by_id=requested_by.id,
        status=status,
        reason=reason,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


# ---------------------------------------------------------------------------
# Login helper — gera token JWT pronto pra usar em headers
# ---------------------------------------------------------------------------

def login_as(client: Any, email: str, password: str = "senha123") -> dict[str, str]:
    """Loga e retorna o header Authorization pronto."""
    resp = client.post("/api/login", json={"identifier": email, "password": password})
    assert resp.status_code == 200, f"Login falhou: {resp.status_code} {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Imagem de teste — gera PNG/JPEG válido em memória
# ---------------------------------------------------------------------------

def make_test_image(
    *,
    fmt: str = "PNG",
    size: tuple[int, int] = (200, 200),
    color: tuple[int, int, int] = (100, 150, 200),
) -> bytes:
    """Gera bytes de uma imagem PIL válida."""
    import io

    from PIL import Image

    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()
