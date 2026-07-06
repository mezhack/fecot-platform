# Spec 002 — Gestão de atletas

- **Status**: Implementado
- **ADRs relacionados**: [002](../decisions/ADR-002-modelo-unico-athlete-com-roles.md), [003](../decisions/ADR-003-graduacao-somente-via-fluxo-aprovacao.md), [005](../decisions/ADR-005-cpf-como-senha-inicial.md)

## Objetivo

Permitir que professores, gestores e administradores cadastrem e mantenham o registro de
atletas da federação, respeitando hierarquia de permissões e preservando o histórico.

## Requisitos funcionais

- **RF-001** — Listar atletas com filtros (`home_academy_id`, `role`, `active`, `search`
  por nome/email/CPF), paginação (`skip`/`limit` ≤ 500) e ordenação por nome — para
  teacher+.
- **RF-002** — Consultar um atleta pelo id (teacher+; atleta comum só a si mesmo).
- **RF-003** — Criar atleta (teacher+), com senha opcional.
- **RF-004** — Editar dados administrativos de um atleta (PATCH parcial ou PUT), inclusive
  redefinir senha, conforme permissões contextuais.
- **RF-005** — Remover atleta (somente admin).

## Regras de negócio

### Permissões

- **RN-001** — Role `athlete` não lista nem consulta outros atletas (403) — usa `/api/me`.
- **RN-002** — Editar dados básicos de um atleta pode: admin, o próprio, o **manager da
  `home_academy`** do atleta, ou o **professor individual** (`professor_id`) do atleta.
  Professor que apenas ensina na mesma academia, mas não é o professor individual nem
  manager, **não pode** (bug corrigido no commit `51caf56`; coberto por teste).
- **RN-003** — Alterar `role` de um atleta: somente admin (403 para os demais, mesmo com
  permissão de edição básica).
- **RN-004** — `graduation` **não é editável por este domínio — por ninguém** (o campo não
  existe em `AthleteUpdate`; valor enviado é ignorado). Único caminho:
  [spec 004](./004-fluxo-de-graduacao.md).
- **RN-005** — Remoção: somente admin, e bloqueada (409) se o atleta é professor individual
  de outros ou responsável (manager) por academia — o histórico da federação prevalece.

### Validações de domínio

- **RN-006** — Email, CPF únicos entre atletas (409). CPF armazenado só dígitos (11) — 422
  se formato inválido.
- **RN-007** — `teacher` e `academy_manager` exigem graduação ≥ 1º Dan (422) — na criação
  e na troca de role.
- **RN-008** — `professor_id` deve apontar para atleta existente com graduação ≥ 1º Dan (422).
- **RN-009** — Graduação deve ser uma das 20 strings canônicas (422); peso entre 0 e 500;
  nascimento não-futuro.
- **RN-010** — Criação sem `password`: com CPF, o CPF vira senha inicial
  ([ADR-005](../decisions/ADR-005-cpf-como-senha-inicial.md)); sem CPF, fica sem login.

## Critérios de aceite (cenários-chave)

1. Teacher lista atletas → 200; atleta comum → 403.
2. Manager edita atleta da sua academia → 200; edita atleta de outra academia → 403.
3. Professor individual edita seu aluno → 200; professor da mesma academia que **não** é o
   professor individual → 403.
4. Teacher tenta mudar `role` de um aluno → 403; admin muda role de aluno `2º Gub` para
   `teacher` → 422 (sem Dan).
5. PATCH com `graduation: "5º Dan"` no corpo → 200, graduação inalterada.
6. Admin deleta atleta que é professor de outros → 409; deleta atleta comum → 204 e os
   ex-alunos ficam com `professor_id = null`.
7. Criar atleta com CPF já existente → 409.

## Fora de escopo

- Mudança de graduação (spec 004); avatar administrativo (spec 005); auto-edição (spec 001).
- Importação em lote, exportação, soft-delete formal (usa-se `active=false` na prática).

## Rastreabilidade

| Elemento | Código | Testes |
|---|---|---|
| Rotas CRUD | `backend/app/api/athletes.py` | `tests/integration/test_athletes_crud.py`, `test_athletes_list.py` |
| Permissões contextuais | `backend/app/models/athlete.py` (`can_edit_athlete_basic`) | idem |
| Validações | `backend/app/schemas/athlete.py`, `core/graduations.py` | `tests/unit/test_graduations.py` |
| Telas | `frontend/app/dashboard/atletas/`, `components/athlete-form.tsx`, `athletes-table.tsx` | — |
