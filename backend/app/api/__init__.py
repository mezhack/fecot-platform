"""Router agregador: monta todas as rotas sob /api."""
from fastapi import APIRouter

from app.api import academies, athletes, auth, graduation_requests, health

api_router = APIRouter(prefix="/api")

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(athletes.router)
api_router.include_router(academies.router)
api_router.include_router(graduation_requests.router)
