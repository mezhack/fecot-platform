"""Graduações do Taekwondo — equivalente à constante GRADUATIONS do model Rails.

Do menor (iniciante) ao maior (mestre).
"""
from __future__ import annotations

GRADUATIONS: list[str] = [
    "10º Gub", "9º Gub", "8º Gub", "7º Gub", "6º Gub",
    "5º Gub", "4º Gub", "3º Gub", "2º Gub", "1º Gub",
    "1º Dan", "2º Dan", "3º Dan", "4º Dan", "5º Dan",
    "6º Dan", "7º Dan", "8º Dan", "9º Dan", "10º Dan",
]


def is_dan_rank(graduation: str) -> bool:
    """True se for graduação Dan (faixa preta)."""
    return "Dan" in graduation


def can_be_professor(graduation: str) -> bool:
    """Regra Rails original: professor precisa ser ao menos 1º Dan (1º a 10º Dan)."""
    import re
    return bool(re.match(r"^([1-9]|10)º Dan$", graduation))
