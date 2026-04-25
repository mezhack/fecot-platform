# syntax=docker/dockerfile:1.6
# ======================================================================
# Fecot Backend — Dockerfile (produção)
# ======================================================================

FROM python:3.12-slim AS base

# Dependências de sistema mínimas
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libjpeg-dev \
        libwebp-dev \
        zlib1g-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# --- Dependências ---
# Copiamos só o pyproject primeiro pra aproveitar cache do Docker
COPY pyproject.toml ./
RUN pip install --upgrade pip \
 && pip install --no-cache-dir \
        "fastapi>=0.115.0" \
        "uvicorn[standard]>=0.32.0" \
        "pydantic>=2.9.0" \
        "pydantic-settings>=2.6.0" \
        "sqlalchemy>=2.0.36" \
        "alembic>=1.14.0" \
        "psycopg2-binary>=2.9.10" \
        "python-jose[cryptography]>=3.3.0" \
        "passlib[bcrypt]>=1.7.4" \
        "bcrypt==4.0.1" \
        "python-dotenv>=1.0.1" \
        "email-validator>=2.2.0" \
        "python-multipart>=0.0.12" \
        "validate-docbr>=1.10.0" \
        "Pillow>=10.4.0"

# --- Código ---
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY scripts/ ./scripts/

# Cria pasta de uploads (volume persistente é montado aqui pelo Easypanel)
RUN mkdir -p /app/uploads/avatars

# Usuário não-root
RUN useradd --create-home --shell /bin/bash fecot \
 && chown -R fecot:fecot /app
USER fecot

EXPOSE 3002

# Healthcheck — start_period generoso pra dar tempo das migrations rodarem
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3002/api/health || exit 1

# Em produção, migrations são aplicadas no boot. O seed inicial é manual
# (rodado uma vez via Console do Easypanel).
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 3002 --workers 2"]
