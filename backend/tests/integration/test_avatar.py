"""Testes de upload e remoção de avatares.

Regras testadas:
- Self-upload via /api/me/avatar funciona
- Validações: tamanho > 5MB, MIME inválido, magic bytes inválidos
- Self-delete remove o arquivo do disco também
- Admin pode subir avatar de qualquer um
- Teacher pode subir do aluno responsável
- Atleta NÃO pode subir de outro
"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from tests.factories import (
    login_as,
    make_admin,
    make_athlete,
    make_teacher,
    make_test_image,
)


class TestSelfUpload:
    def test_upload_png_valido(self, client, db_session: Session):
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        png = make_test_image(fmt="PNG", size=(800, 800))
        resp = client.post(
            "/api/me/avatar",
            headers=headers,
            files={"file": ("foto.png", png, "image/png")},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["avatar_url"] is not None
        assert data["avatar_url"].startswith("/uploads/avatars/")
        assert data["avatar_url"].endswith(".webp")

        # Confirma arquivo no disco
        path = Path(settings.upload_dir) / "avatars" / Path(data["avatar_url"]).name
        assert path.is_file()
        # Tamanho razoável (não vazio, não monstruoso).
        # WebP comprime cores sólidas de forma brutal (~500 bytes), por isso o
        # limite inferior é baixo. 200KB de teto é folgado pra avatar 512x512.
        assert 100 < path.stat().st_size < 200_000

    def test_upload_jpeg_convertido_para_webp(self, client, db_session: Session):
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        jpeg = make_test_image(fmt="JPEG", size=(1200, 900))
        resp = client.post(
            "/api/me/avatar",
            headers=headers,
            files={"file": ("foto.jpg", jpeg, "image/jpeg")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["avatar_url"].endswith(".webp")

        # Verifica que foi redimensionado pra max 512
        from PIL import Image
        path = Path(settings.upload_dir) / "avatars" / Path(data["avatar_url"]).name
        with Image.open(path) as img:
            assert img.format == "WEBP"
            assert max(img.size) <= 512

    def test_upload_substitui_anterior(self, client, db_session: Session):
        """Subir nova foto deve deletar a antiga do disco."""
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        # Primeira upload
        png1 = make_test_image(fmt="PNG", color=(255, 0, 0))
        resp1 = client.post(
            "/api/me/avatar",
            headers=headers,
            files={"file": ("a.png", png1, "image/png")},
        )
        url1 = resp1.json()["avatar_url"]
        path1 = Path(settings.upload_dir) / "avatars" / Path(url1).name
        assert path1.is_file()

        # Segunda upload
        png2 = make_test_image(fmt="PNG", color=(0, 255, 0))
        resp2 = client.post(
            "/api/me/avatar",
            headers=headers,
            files={"file": ("b.png", png2, "image/png")},
        )
        url2 = resp2.json()["avatar_url"]
        assert url2 != url1

        # Arquivo antigo deve ter sido deletado
        assert not path1.is_file()
        # Novo existe
        path2 = Path(settings.upload_dir) / "avatars" / Path(url2).name
        assert path2.is_file()

    def test_upload_arquivo_grande_retorna_413(
        self, client, db_session: Session
    ):
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        # 6 MB de bytes — passa o limite de 5MB
        big = b"\xff\xd8\xff" + b"x" * (6 * 1024 * 1024)  # JPEG magic + lixo
        resp = client.post(
            "/api/me/avatar",
            headers=headers,
            files={"file": ("big.jpg", big, "image/jpeg")},
        )
        assert resp.status_code == 413

    def test_upload_pdf_retorna_415(self, client, db_session: Session):
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        pdf = b"%PDF-1.4\n%fake content"
        resp = client.post(
            "/api/me/avatar",
            headers=headers,
            files={"file": ("file.pdf", pdf, "application/pdf")},
        )
        assert resp.status_code == 415

    def test_upload_texto_disfarcado_de_png_retorna_415(
        self, client, db_session: Session
    ):
        """Magic bytes pegam texto puro mesmo com content-type fake."""
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        fake = b"this is not an image, just text pretending to be png"
        resp = client.post(
            "/api/me/avatar",
            headers=headers,
            files={"file": ("fake.png", fake, "image/png")},
        )
        assert resp.status_code == 415

    def test_upload_sem_auth_retorna_401(self, client):
        png = make_test_image()
        resp = client.post(
            "/api/me/avatar",
            files={"file": ("foto.png", png, "image/png")},
        )
        assert resp.status_code == 401


class TestSelfDelete:
    def test_delete_remove_avatar(self, client, db_session: Session):
        athlete = make_athlete(db_session)
        headers = login_as(client, athlete.email)

        # Sobe primeiro
        png = make_test_image()
        upload_resp = client.post(
            "/api/me/avatar",
            headers=headers,
            files={"file": ("foto.png", png, "image/png")},
        )
        url = upload_resp.json()["avatar_url"]
        path = Path(settings.upload_dir) / "avatars" / Path(url).name
        assert path.is_file()

        # Deleta
        resp = client.delete("/api/me/avatar", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["avatar_url"] is None

        # Arquivo físico foi removido
        assert not path.is_file()


class TestAdminUpload:
    def test_admin_sobe_para_qualquer_atleta(self, client, db_session: Session):
        admin = make_admin(db_session)
        target = make_athlete(db_session)
        headers = login_as(client, admin.email)

        png = make_test_image()
        resp = client.post(
            f"/api/athletes/{target.id}/avatar",
            headers=headers,
            files={"file": ("foto.png", png, "image/png")},
        )
        assert resp.status_code == 200
        assert resp.json()["avatar_url"] is not None

    def test_teacher_sobe_para_aluno_dele(self, client, db_session: Session):
        teacher = make_teacher(db_session)
        aluno = make_athlete(db_session, professor=teacher)
        headers = login_as(client, teacher.email)

        png = make_test_image()
        resp = client.post(
            f"/api/athletes/{aluno.id}/avatar",
            headers=headers,
            files={"file": ("foto.png", png, "image/png")},
        )
        assert resp.status_code == 200

    def test_atleta_nao_sobe_para_outro(self, client, db_session: Session):
        a1 = make_athlete(db_session)
        a2 = make_athlete(db_session)
        headers = login_as(client, a1.email)

        png = make_test_image()
        resp = client.post(
            f"/api/athletes/{a2.id}/avatar",
            headers=headers,
            files={"file": ("foto.png", png, "image/png")},
        )
        assert resp.status_code == 403
