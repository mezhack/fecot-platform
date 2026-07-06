# FECOT Platform — instruções do projeto

Plataforma da Federação Centro-Oeste de Taekwondo. Monorepo: `backend/` (Python 3.12 +
FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL) e `frontend/` (Next.js 16 App Router +
React 19 + TypeScript + Tailwind + shadcn/ui).

## Documentação é fonte de verdade (padrão SDD)

Antes de implementar qualquer coisa, leia:

- `docs/README.md` — índice, fluxo SDD e **divergências conhecidas**
- `docs/constitution.md` — princípios inegociáveis
- `docs/specs/` — comportamento esperado por domínio (fonte de verdade)
- `docs/architecture/` — overview, modelo de dados, contrato de API, segurança
- `docs/decisions/` — ADRs (decisões aceitas; só mudam por substituição formal)

Fluxo obrigatório para mudança de comportamento: **spec primeiro** (e ADR, se houver
decisão arquitetural) → implementar → testes → sincronizar `docs/architecture/api.md`,
spec e README **no mesmo commit**.

## Regras específicas deste projeto

- **Autorização sempre no backend** — frontend só esconde UI (constitution § II).
- **`graduation` nunca é editável diretamente**, nem por admin — só via fluxo de
  GraduationRequest (ADR-003). Não criar atalhos.
- Listas de graduações são espelhadas: `backend/app/core/graduations.py` ↔
  `frontend/lib/graduations.ts` — **sempre alterar as duas juntas** (ADR-007).
- Mudou contrato da API → atualizar o cliente tipado `frontend/lib/api.ts` no mesmo commit.
- Todo acesso HTTP do frontend passa por `lib/api.ts` — sem `fetch` solto em componentes.
- Mensagens de erro da API (`detail`) em português e acionáveis.
- Regra de negócio nova exige teste em `backend/tests/` — a suíte (105 testes) passa
  sempre, zero regressões.
- `bcrypt` está pinado em 4.0.1 (compatibilidade com passlib) — não subir sem testar.

## Comandos

```bash
# Dev completo (frontend :3000, API :3002, Postgres :5432)
docker compose up --build

# Testes do backend (precisam de Postgres local com usuário fecot/fecot CREATEDB)
cd backend && pytest

# Lint
cd backend && ruff check .        # backend
cd frontend && npm run lint       # frontend

# Migrations
cd backend && alembic upgrade head
cd backend && alembic revision --autogenerate -m "descricao"

# Seed — APAGA todos os dados antes de popular; nunca em produção
cd backend && python -m scripts.seed
```
