# ADR-001 — Reescrita completa: Rails → FastAPI + Next.js

- **Status**: Aceito (implementado — commit `ee2d156 "Reescrita completa: FastAPI + Next.js"`)
- **Data**: 2026-04 (registrado retroativamente em 2026-07-03)
- **Specs afetadas**: todas

## Contexto

A plataforma original da FECOT era um monólito Ruby on Rails. A reescrita visou separar
API e interface, modernizar a stack e tipar as duas pontas. Restos do sistema antigo ainda
são visíveis no código como referência de paridade (comentários "regra Rails original" em
`core/graduations.py`, porta 3002 herdada do `start.sh`, `password_digest` como nome de
coluna no padrão Rails/has_secure_password).

## Decisão

Reescrever como duas aplicações:

- **Backend**: Python 3.12 + FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL, servindo API
  REST em `/api` na porta 3002 (mantida do sistema antigo para não quebrar
  infra/integrações existentes).
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind + shadcn/ui,
  na porta 3000, consumindo a API via cliente tipado único (`lib/api.ts`).

As regras de negócio do Rails foram portadas com paridade (graduações, exigência de
≥ 1º Dan para professor, papéis).

## Alternativas consideradas

- **Manter e evoluir o Rails** — descartado: motivação central era a troca de stack.
- **Fullstack Next.js (API routes)** — descartado: separar a API permite consumo futuro
  por outros clientes (app mobile, integrações da Liga Nacional) e mantém as regras de
  negócio em um único lugar tipado com Pydantic.

## Consequências

- Dois deploys e dois processos (systemd `fecot-backend` + `fecot-frontend` atrás de nginx).
- Tipos duplicados entre Pydantic e TypeScript — mudanças de contrato exigem tocar os dois
  lados no mesmo commit (regra formalizada em [architecture/api.md](../architecture/api.md)).
- O último resquício funcional do Rails (um TODO na página de recuperar senha que
  referenciava o backend antigo) foi removido em 2026-07-06, quando a página passou a
  orientar o fluxo real de redefinição.
