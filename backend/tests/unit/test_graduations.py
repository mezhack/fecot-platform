"""Testes unitários do módulo de graduações."""
from __future__ import annotations

import pytest

from app.core.graduations import (
    GRADUATIONS,
    can_be_professor,
    is_dan_rank,
)


@pytest.mark.unit
class TestGraduations:
    def test_lista_tem_20_niveis(self):
        # 10 Gub + 10 Dan
        assert len(GRADUATIONS) == 20

    def test_lista_comeca_em_10_gub_e_termina_em_10_dan(self):
        assert GRADUATIONS[0] == "10º Gub"
        assert GRADUATIONS[-1] == "10º Dan"

    @pytest.mark.parametrize(
        "graduation,expected",
        [
            ("10º Gub", False),
            ("1º Gub", False),
            ("1º Dan", True),
            ("5º Dan", True),
            ("10º Dan", True),
        ],
    )
    def test_is_dan_rank(self, graduation: str, expected: bool):
        assert is_dan_rank(graduation) is expected

    @pytest.mark.parametrize(
        "graduation,expected",
        [
            ("10º Gub", False),
            ("1º Gub", False),
            ("1º Dan", True),
            ("10º Dan", True),
        ],
    )
    def test_can_be_professor(self, graduation: str, expected: bool):
        """Professor/manager precisa ter graduação Dan."""
        assert can_be_professor(graduation) is expected

    def test_valid_graduations_are_in_list(self):
        assert "3º Dan" in GRADUATIONS
        assert "5º Gub" in GRADUATIONS
        assert "Faixa Preta" not in GRADUATIONS

    def test_graduations_are_unique(self):
        """Não pode haver graduação duplicada."""
        assert len(set(GRADUATIONS)) == len(GRADUATIONS)
