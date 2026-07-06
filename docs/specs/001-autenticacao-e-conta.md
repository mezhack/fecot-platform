# Spec 001 — Autenticação e conta

- **Status**: Implementado
- **ADRs relacionados**: [002](../decisions/ADR-002-modelo-unico-athlete-com-roles.md), [004](../decisions/ADR-004-jwt-stateless-localstorage.md), [005](../decisions/ADR-005-cpf-como-senha-inicial.md)

## Objetivo

Permitir que qualquer usuário da federação (atleta, professor, gestor, admin — todos
registros `Athlete`) entre na plataforma e gerencie os próprios dados pessoais e senha,
sem poder alterar os próprios dados federativos.

## Requisitos funcionais

- **RF-001** — Login com `identifier` (email **ou** CPF, aceito com ou sem pontuação) +
  senha, retornando token JWT e o perfil completo do atleta.
- **RF-002** — Usuário autenticado consulta o próprio perfil (`GET /api/me`), incluindo
  campos derivados (idade, nomes de academia/professor, `can_be_professor`).
- **RF-003** — Usuário autenticado edita os próprios **dados pessoais**: nome, email,
  telefone, data de nascimento, peso, sexo, avatar_url.
- **RF-004** — Usuário autenticado troca a própria senha informando a senha atual.
- **RF-005** — Após o login, o frontend direciona por papel: `athlete` → `/perfil`;
  demais roles → `/dashboard`.

## Regras de negócio

- **RN-001** — Credenciais inválidas (usuário inexistente, sem senha cadastrada ou senha
  errada) retornam **401 com mensagem genérica** — não revelar qual parte falhou.
- **RN-002** — Conta com `active = false` não loga (403 no login com mensagem específica)
  e perde acesso imediato em requisições autenticadas (401 no lookup), mesmo com token
  ainda não expirado.
- **RN-003** — O token JWT vale 24h (configurável), claims `sub`/`role`/`iat`/`exp`;
  a autorização usa sempre o role atual do banco, nunca o do claim.
- **RN-004** — A auto-edição (`PATCH /api/me`) **não aceita campos federativos**: `role`,
  `graduation`, `home_academy_id`, `professor_id`, `active` e `cpf` não existem no schema
  `SelfUpdateRequest` (CPF é imutável após o cadastro).
- **RN-005** — Email alterado na auto-edição não pode colidir com o de outro atleta (409).
- **RN-006** — Troca de senha exige a senha atual correta (401) e nova senha de 6 a 128
  caracteres.
- **RN-007** — Atleta sem `password_digest` (criado sem senha e sem CPF) não consegue
  logar até um responsável definir senha via edição administrativa.
- **RN-008** — Data de nascimento não pode estar no futuro (422).

## Critérios de aceite (cenários-chave)

1. Login com email válido → 200, `{access_token, token_type: "bearer", athlete}`.
2. Login com CPF formatado (`123.456.789-01`) → normaliza e autentica igual ao CPF puro.
3. Login de conta inativa → 403 "Conta inativa…".
4. `GET /api/me` sem token, com token expirado ou adulterado → 401.
5. `PATCH /api/me` enviando `graduation` ou `role` → campos ignorados (não há erro; o
   schema não os conhece) e nada muda no banco.
6. `PATCH /api/update_password` com senha atual errada → 401; com correta → 204 e a senha
   antiga deixa de funcionar no login.

## Fora de escopo (estado atual)

- **Recuperação de senha self-service** — não há envio de email. A página
  `/recuperar-senha` orienta o fluxo real: o responsável (professor individual, gestor da
  academia ou admin) redefine via `PATCH /api/athletes/{id}` com `password`, e o atleta
  troca depois em Meu Perfil. Implementar self-service exigiria infraestrutura de email
  (registrado em [docs/README.md § Melhorias futuras](../README.md)).
- Refresh token, MFA, rate limiting de login (limitações registradas em
  [security.md](../architecture/security.md)).

## Rastreabilidade

| Elemento | Código | Testes |
|---|---|---|
| Login, /me, self-edit, senha | `backend/app/api/auth.py` | `tests/integration/test_auth.py`, `test_self_edit.py` |
| JWT + bcrypt | `backend/app/core/security.py` | `tests/unit/test_security.py` |
| Extração do usuário do token | `backend/app/api/deps.py` | `tests/integration/test_auth.py` |
| Schemas (LoginRequest, SelfUpdateRequest, UpdatePasswordRequest) | `backend/app/schemas/athlete.py` | idem |
| Sessão no cliente | `frontend/hooks/use-auth.ts`, `frontend/lib/api.ts` | — |
| Telas | `frontend/app/login/`, `frontend/app/perfil/` | — |
