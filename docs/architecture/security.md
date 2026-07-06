# Arquitetura — Segurança

## Autenticação

- **JWT HS256** (`python-jose`), segredo em `JWT_SECRET` (obrigatório trocar em produção).
- Claims: `sub` (id do atleta), `role`, `iat`, `exp`. Validade default **24h**
  (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440`). Sem refresh token e sem revogação server-side —
  logout é apenas client-side ([ADR-004](../decisions/ADR-004-jwt-stateless-localstorage.md)).
- `get_current_athlete` (`backend/app/api/deps.py`): decodifica, carrega o atleta do banco
  e rejeita 401 se token inválido, atleta inexistente **ou conta inativa** — desativar um
  atleta corta o acesso imediatamente, mesmo com token ainda válido.
- Senhas: **bcrypt** via passlib (`bcrypt` pinado em 4.0.1 por compatibilidade com o
  passlib atual — não subir sem testar). Atleta sem `password_digest` não consegue logar.
- Senha inicial: se o atleta é criado com CPF e sem senha, **o CPF vira a senha inicial**
  ([ADR-005](../decisions/ADR-005-cpf-como-senha-inicial.md)) — deve ser trocada via
  `PATCH /api/update_password`.

## Autorização

Duas camadas, sempre no backend (frontend só esconde UI — [constitution § II](../constitution.md)):

1. **Guards de role por endpoint** — `require_admin`, `require_manager_or_admin`,
   `require_teacher_or_above` (403).
2. **Regras contextuais** — métodos do modelo `Athlete`:
   - `can_edit_athlete_basic(other)`: admin ∨ o próprio ∨ manager da `home_academy` do alvo
     ∨ professor individual do alvo.
   - `can_request_graduation_change(other)`: admin ∨ professor individual ∨ manager da
     academia do alvo.
   - `manages(academy)`: admin ∨ manager daquela academia específica.
   - `can_approve_graduation()`: só admin.

### Matriz de permissões

| Ação | athlete | teacher | academy_manager | admin |
|---|---|---|---|---|
| Ver/editar o próprio perfil (`/api/me`) | ✅ | ✅ | ✅ | ✅ |
| Listar atletas | ❌ 403 | ✅ | ✅ | ✅ |
| Criar atleta | ❌ | ✅ | ✅ | ✅ |
| Editar atleta (dados básicos) | só a si | seus alunos | alunos das suas academias | todos |
| Alterar `role` de atleta | ❌ | ❌ | ❌ | ✅ |
| Alterar `graduation` diretamente | ❌ **ninguém** — só via fluxo de aprovação ([ADR-003](../decisions/ADR-003-graduacao-somente-via-fluxo-aprovacao.md)) | | | |
| Remover atleta | ❌ | ❌ | ❌ | ✅ |
| Listar/ver academias | ✅ | ✅ | ✅ | ✅ |
| Criar/remover academia | ❌ | ❌ | ❌ | ✅ |
| Editar academia | ❌ | ❌ | só a(s) sua(s) | todas |
| Associar/remover professor de academia | ❌ | ❌ | só na(s) sua(s) | todas |
| Solicitar mudança de graduação | ❌ | seus alunos | alunos das suas academias | qualquer |
| Aprovar/rejeitar graduação | ❌ | ❌ | ❌ | ✅ |
| Trocar avatar de outro atleta | ❌ | seus alunos | alunos das suas academias | todos |

Invariantes de elegibilidade (422 na violação): `teacher` e `academy_manager` exigem
graduação ≥ 1º Dan; manager de academia exige role `academy_manager` ou `admin`;
professor associado a academia exige role teacher+ e ≥ 1º Dan.

## Upload de avatar (defesa em profundidade)

Implementação: `backend/app/services/avatar_storage.py`. Camadas, nesta ordem:

1. MIME declarado ∈ {JPEG, PNG, WebP} (415).
2. Tamanho ≤ 5 MB (413) e não-vazio (400).
3. **Magic bytes** conferidos — bloqueia arquivo renomeado (415).
4. **Re-encode via Pillow**: decodifica, achata alpha sobre branco, redimensiona a ≤ 512px
   e regrava como WebP — o arquivo original nunca é servido, neutralizando payloads
   embutidos.
5. Nome aleatório (`secrets.token_urlsafe(16)`) — sem input do usuário no filesystem.
6. Deleção: só apaga paths internos (`/uploads/avatars/…`), força `basename` — sem path
   traversal; URLs externas antigas são ignoradas.

## Outras medidas em vigor

- **CORS**: lista explícita de origens via `CORS_ORIGINS` — nunca `*` com credenciais.
- **Swagger/ReDoc desabilitados em produção** (`APP_ENV=production`).
- Mensagens de login não distinguem "usuário não existe" de "senha errada" (401 genérico).
- Produção: systemd com hardening básico, SSL Let's Encrypt, backups diários de banco e
  uploads (ver [DEPLOY.md](../../DEPLOY.md)).

## Limitações conhecidas (aceitas por ora — mudanças exigem ADR)

| Limitação | Risco | Mitigação atual |
|---|---|---|
| Token em `localStorage` | Exposto a XSS | Superfície de terceiros pequena; React escapa por padrão |
| Sem revogação/refresh de JWT | Token roubado vale até expirar (24h) | Conta inativa corta acesso no lookup |
| CPF como senha inicial | Senha fraca e descobrível | Documentado; troca obrigatória é processual, não forçada pelo sistema |
| Sem rate limiting / lockout no login | Força bruta possível | Nginx pode limitar em produção (não configurado por padrão) |
| Sem recuperação de senha self-service | — | Página `/recuperar-senha` orienta o fluxo real: responsável redefine via PATCH |
| Senhas do seed são públicas no repositório | Comprometimento se mantidas | DEPLOY.md § 7.1 exige troca pós-deploy |
