# Arquitetura — Contrato da API

Referência normativa dos endpoints. O detalhe request/response de cada rota está no
Swagger (`/docs`, apenas fora de produção); este documento é a fonte de verdade de
**permissões e semântica de erro**. Implementação: `backend/app/api/`.
Cliente tipado correspondente: `frontend/lib/api.ts`.

## Convenções

- Base path: **`/api`**. Autenticação: header `Authorization: Bearer <JWT>`.
- Erros: corpo `{ "detail": "<mensagem em português>" }`.
- Semântica dos códigos:

| Código | Significado no projeto |
|---|---|
| 401 | Sem token, token inválido/expirado, conta inativa no lookup, senha atual errada |
| 403 | Autenticado, mas sem permissão (role ou regra contextual) |
| 404 | Recurso inexistente |
| 409 | Conflito de unicidade (email/CPF/CNPJ) ou de estado (request já revisada, pendente duplicada, deleção bloqueada) |
| 422 | Validação de domínio (graduação inválida, role sem Dan, professor inexistente...) |
| 413 / 415 | Upload: arquivo grande demais / formato não aceito |

- Listagens: paginação por `skip` (≥ 0) e `limit` (1–500, default 100).

## Health

| Método | Rota | Auth | Resposta |
|---|---|---|---|
| GET | `/api/health` | — | `{status, database}` — `database: "error"` se o SELECT 1 falhar (HTTP continua 200) |

## Autenticação e conta ([spec 001](../specs/001-autenticacao-e-conta.md))

| Método | Rota | Quem | Erros relevantes |
|---|---|---|---|
| POST | `/api/login` | público | 401 credenciais; 403 conta inativa |
| GET | `/api/me` | autenticado | 401 |
| PATCH | `/api/me` | autenticado | 409 email em uso — **só campos pessoais**; federativos não existem no schema |
| PATCH | `/api/update_password` | autenticado | 401 senha atual incorreta; 204 no sucesso |
| POST | `/api/me/avatar` | autenticado | 400/413/415 (ver [spec 005](../specs/005-avatares.md)) |
| DELETE | `/api/me/avatar` | autenticado | — |

`POST /api/login` aceita `identifier` = email **ou** CPF (com ou sem pontuação).
Resposta: `{access_token, token_type: "bearer", athlete}`.

## Atletas ([spec 002](../specs/002-gestao-de-atletas.md))

| Método | Rota | Quem pode | Erros relevantes |
|---|---|---|---|
| GET | `/api/athletes` | teacher+ | 403 para role `athlete` |
| POST | `/api/athletes` | teacher+ | 409 email/CPF; 422 professor inválido ou role sem Dan |
| GET | `/api/athletes/{id}` | o próprio, ou teacher+ | 403, 404 |
| PATCH/PUT | `/api/athletes/{id}` | admin, o próprio, manager da academia, professor individual | 403 (inclui `role` por não-admin), 404, 409, 422 |
| DELETE | `/api/athletes/{id}` | admin | 404; 409 se é professor de outros ou gerencia academia |
| POST | `/api/athletes/{id}/avatar` | quem pode editar o atleta | 403, 404, 400/413/415 |
| DELETE | `/api/athletes/{id}/avatar` | quem pode editar o atleta | 403, 404 |

Filtros de `GET /api/athletes`: `home_academy_id`, `role`, `active`,
`search` (ilike em nome/email/CPF), ordenação por nome.

**`graduation` não é campo aceito em PATCH/PUT** — não existe no schema `AthleteUpdate`
e é silenciosamente ignorado se enviado. Único caminho: fluxo de graduação (spec 004).

## Academias ([spec 003](../specs/003-gestao-de-academias.md))

| Método | Rota | Quem pode | Erros relevantes |
|---|---|---|---|
| GET | `/api/academies` | autenticado | — (filtros: `active`, `search` nome/cidade) |
| GET | `/api/academies/public/map` | **público** | — (só ativas com lat/long) |
| GET | `/api/academies/{id}` | autenticado | 404 |
| POST | `/api/academies` | admin | 409 CNPJ; 422 manager inválido |
| PATCH/PUT | `/api/academies/{id}` | admin, ou manager **desta** academia | 403, 404, 409, 422 |
| DELETE | `/api/academies/{id}` | admin | 404; 409 se tem alunos |
| POST | `/api/academies/{id}/teachers` | admin, ou manager desta academia | 404; 409 já associado; 422 atleta não elegível |
| DELETE | `/api/academies/{id}/teachers/{athlete_id}` | admin, ou manager desta academia | 404 (academia ou vínculo) |

## Solicitações de graduação ([spec 004](../specs/004-fluxo-de-graduacao.md))

| Método | Rota | Quem pode | Erros relevantes |
|---|---|---|---|
| GET | `/api/graduation_requests` | autenticado — **não-admin vê só o que lhe diz respeito** | — (filtros: `status`, `athlete_id`) |
| POST | `/api/graduation_requests` | admin, professor individual do atleta, manager da academia dele | 403, 404 atleta; 422 graduação igual; 409 pendente já existe |
| GET | `/api/graduation_requests/{id}` | autenticado | 404 |
| POST | `/api/graduation_requests/{id}/approve` | admin | 404; 409 se não está pendente |
| POST | `/api/graduation_requests/{id}/reject` | admin | 404; 409 se não está pendente |

## Estáticos

`GET /uploads/avatars/<arquivo>.webp` — servidos pelo FastAPI (`StaticFiles`) em dev;
em produção o nginx faz alias direto para o diretório (o mount continua existindo).

## Regras para evoluir o contrato

1. Atualizar a spec do domínio e esta página **antes** do código (fluxo SDD).
2. Mudança breaking (remover campo, mudar semântica de erro, renomear rota) exige ADR.
3. O cliente `frontend/lib/api.ts` e os tipos TS acompanham no mesmo commit.
