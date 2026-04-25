"""Entry point da aplicação FastAPI."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Local pra startup/shutdown. Hoje só um log, mas pode ficar warm-up aqui.
    print(f"[FECOT] Iniciando em {settings.app_env} na porta {settings.port}")
    # Garante que a pasta de uploads existe
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    (Path(settings.upload_dir) / "avatars").mkdir(parents=True, exist_ok=True)
    yield
    print("[FECOT] Encerrando.")


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API da plataforma FECOT — Federação Centro-Oeste de Taekwondo",
    lifespan=lifespan,
    # Docs só em dev/staging. Em produção, considere proteger ou desabilitar.
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)


# --- CORS ---
# IMPORTANTE: a lista é explícita (vinda do .env), nunca "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Rotas ---
app.include_router(api_router)

# --- Arquivos estáticos (uploads/avatares) ---
# Em dev, o próprio FastAPI serve. Em produção, recomenda-se que o nginx
# sirva direto de /var/lib/fecot/uploads via `alias` para performance —
# mas deixar o mount aqui não atrapalha (nginx intercepta antes).
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount(
    settings.upload_public_prefix,
    StaticFiles(directory=settings.upload_dir),
    name="uploads",
)


@app.get("/", tags=["Root"])
def root() -> dict:
    return {
        "service": settings.app_name,
        "status": "running",
        "docs": "/docs" if not settings.is_production else None,
    }
