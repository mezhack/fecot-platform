"""Configurações da aplicação, lidas de variáveis de ambiente / .env."""
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    app_name: str = "FECOT Platform API"
    app_env: str = "development"  # development | production | test
    debug: bool = False

    # --- Servidor ---
    host: str = "0.0.0.0"
    port: int = 3002  # mantém a porta que o start.sh original usava

    # --- Database ---
    # Ex: postgresql+psycopg2://user:pass@host:5432/fecot_dev
    database_url: str = Field(
        default="postgresql+psycopg2://fecot:fecot@localhost:5432/fecot_dev"
    )

    # --- JWT ---
    jwt_secret: str = Field(default="change-me-in-production-please")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24  # 24h

    # --- CORS ---
    # Separados por vírgula no .env: http://localhost:3000,https://meusite.com
    cors_origins: str = "http://localhost:3000"

    # --- Upload / Storage ---
    # Pasta onde os avatares são salvos em disco.
    # Dev: ./uploads (relativo ao cwd do backend)
    # Prod: /var/lib/fecot/uploads (criado no deploy, persistido)
    upload_dir: str = "./uploads"
    # Subpath servido publicamente — em prod, nginx faz o alias direto pra upload_dir
    upload_public_prefix: str = "/uploads"
    # Limite de upload de avatar, em MB
    avatar_max_mb: int = 5
    # Dimensão máxima (quadrado) do avatar após processamento
    avatar_max_size: int = 512

    @field_validator("cors_origins")
    @classmethod
    def _split_origins(cls, v: str) -> str:
        # mantém como string; o app transforma em lista
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Cacheia as settings pra não reler o .env a cada import."""
    return Settings()


settings = get_settings()
