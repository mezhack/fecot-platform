"""Testes unitários do módulo de processamento de avatares."""
from __future__ import annotations

import pytest

from app.services.avatar_storage import _check_magic_bytes


@pytest.mark.unit
class TestMagicBytes:
    def test_jpeg_magic_bytes(self):
        # JPEG sempre começa com FF D8 FF
        jpeg_header = b"\xff\xd8\xff\xe0\x00\x10JFIF"
        assert _check_magic_bytes(jpeg_header) is True

    def test_png_magic_bytes(self):
        png_header = b"\x89PNG\r\n\x1a\nIHDR"
        assert _check_magic_bytes(png_header) is True

    def test_webp_magic_bytes(self):
        # RIFF + 4 bytes de tamanho + WEBP
        webp_header = b"RIFF\x00\x00\x00\x00WEBP"
        assert _check_magic_bytes(webp_header) is True

    def test_riff_without_webp_marker_rejected(self):
        # RIFF sozinho não basta — precisa ter WEBP nos bytes 8-11
        # (RIFF é genérico, AVI/WAV também usam)
        wav_header = b"RIFF\x00\x00\x00\x00WAVE"
        assert _check_magic_bytes(wav_header) is False

    def test_text_file_rejected(self):
        text = b"hello, world! this is plain text"
        assert _check_magic_bytes(text) is False

    def test_pdf_rejected(self):
        pdf_header = b"%PDF-1.4\n"
        assert _check_magic_bytes(pdf_header) is False

    def test_empty_bytes_rejected(self):
        assert _check_magic_bytes(b"") is False
