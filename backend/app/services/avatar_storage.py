"""Serviço de armazenamento de avatares.

Responsável por:
- Validar tipo e tamanho do arquivo enviado
- Redimensionar e converter pra WebP
- Salvar no disco em UPLOAD_DIR/avatars/
- Remover avatar antigo quando um novo é enviado
- Gerar path público (que vira `avatar_url` no banco)
"""
from __future__ import annotations

import io
import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.core.config import settings

# MIME types aceitos
_ACCEPTED_MIME = {"image/jpeg", "image/png", "image/webp"}

# Magic bytes (os primeiros bytes do arquivo) — validação a mais
# pra evitar upload de arquivo malicioso renomeado.
_MAGIC_BYTES = {
    b"\xff\xd8\xff": "jpeg",     # JPEG
    b"\x89PNG\r\n\x1a\n": "png",  # PNG
    b"RIFF": "webp",              # WebP (os 4 primeiros; WEBP aparece no byte 8)
}


def _avatars_dir() -> Path:
    d = Path(settings.upload_dir) / "avatars"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _check_magic_bytes(head: bytes) -> bool:
    """True se os primeiros bytes batem com JPEG/PNG/WebP."""
    for magic in _MAGIC_BYTES:
        if head.startswith(magic):
            # WebP precisa do "WEBP" no byte 8
            if magic == b"RIFF":
                return len(head) >= 12 and head[8:12] == b"WEBP"
            return True
    return False


async def save_avatar(upload: UploadFile) -> str:
    """Processa o arquivo enviado e devolve o `avatar_url` (path público).

    Lança HTTPException em caso de erro de validação ou processamento.
    """
    # ------------------------------------------------------------------
    # 1. Validação básica do arquivo
    # ------------------------------------------------------------------
    if upload.content_type not in _ACCEPTED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Formato '{upload.content_type}' não aceito. "
                "Use JPEG, PNG ou WebP."
            ),
        )

    max_bytes = settings.avatar_max_mb * 1024 * 1024
    # Lê todo o corpo. Como limitamos a 5 MB, não há risco de OOM.
    raw = await upload.read()
    if len(raw) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo vazio",
        )
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Arquivo maior que o limite de {settings.avatar_max_mb} MB",
        )

    # Magic bytes check — previne upload de arquivo disfarçado
    if not _check_magic_bytes(raw[:16]):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Conteúdo do arquivo não parece ser uma imagem válida",
        )

    # ------------------------------------------------------------------
    # 2. Processamento com Pillow
    # ------------------------------------------------------------------
    try:
        img = Image.open(io.BytesIO(raw))
    except UnidentifiedImageError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível ler a imagem",
        ) from err

    # Converte pra RGB (WebP suporta RGBA mas vamos simplificar).
    # Se for RGBA/P, achata sobre branco — evita resultados estranhos.
    if img.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Redimensiona mantendo proporção, nunca passando de AVATAR_MAX_SIZE
    max_size = settings.avatar_max_size
    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

    # ------------------------------------------------------------------
    # 3. Salva no disco
    # ------------------------------------------------------------------
    filename = f"{secrets.token_urlsafe(16)}.webp"
    dest = _avatars_dir() / filename
    try:
        img.save(dest, format="WEBP", quality=85, method=6)
    except OSError as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao salvar a imagem no servidor",
        ) from err

    # URL pública que vai pro banco
    return f"{settings.upload_public_prefix}/avatars/{filename}"


def delete_avatar(avatar_url: str | None) -> None:
    """Remove o arquivo físico de um avatar, se existir.

    Seguro chamar com None ou com URL externa — só apaga caminhos que
    começam com UPLOAD_PUBLIC_PREFIX (paths internos gerados por nós).
    """
    if not avatar_url:
        return
    if not avatar_url.startswith(settings.upload_public_prefix + "/"):
        # URL externa (ex: dicebear antigo). Não mexemos.
        return

    # Extrai nome do arquivo com segurança — só o basename, sem path traversal
    rel = avatar_url[len(settings.upload_public_prefix) :].lstrip("/")
    # rel esperado: "avatars/abc123.webp"
    parts = rel.split("/")
    if len(parts) != 2 or parts[0] != "avatars":
        return
    filename = Path(parts[1]).name  # force basename
    if not filename or filename in (".", ".."):
        return

    target = _avatars_dir() / filename
    try:
        if target.is_file():
            target.unlink()
    except OSError:
        # Falha ao deletar não é crítico — arquivo órfão é inofensivo
        pass
