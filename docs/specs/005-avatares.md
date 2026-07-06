# Spec 005 — Avatares

- **Status**: Implementado
- **ADRs relacionados**: [006](../decisions/ADR-006-avatares-disco-local-webp.md)

## Objetivo

Foto de perfil para atletas: upload pelo próprio usuário ou por um responsável
(professor individual, manager da academia, admin), com processamento seguro no servidor.

## Requisitos funcionais

- **RF-001** — Upload do próprio avatar (`POST /api/me/avatar`, multipart `file`).
- **RF-002** — Remoção do próprio avatar (`DELETE /api/me/avatar`).
- **RF-003** — Upload/remoção administrativa do avatar de outro atleta
  (`POST|DELETE /api/athletes/{id}/avatar`) por quem pode editar o atleta.
- **RF-004** — Exibição no frontend via `resolveAvatarUrl` (prefixa `API_URL` em paths
  internos; URLs externas passam intactas).

## Regras de negócio

- **RN-001** — Formatos aceitos: JPEG, PNG, WebP; tamanho ≤ 5 MB (`AVATAR_MAX_MB`).
  Violações: 415 (MIME ou magic bytes), 413 (tamanho), 400 (vazio/ilegível).
- **RN-002** — Toda imagem é **re-encodada**: redimensionada a ≤ 512px
  (`AVATAR_MAX_SIZE`), alpha achatado sobre branco, salva como WebP q85 com nome
  aleatório. O arquivo original nunca é armazenado nem servido.
- **RN-003** — Permissão administrativa segue `can_edit_athlete_basic`
  ([spec 002 RN-002](./002-gestao-de-atletas.md)) — 403 fora disso.
- **RN-004** — Ao substituir/remover, o arquivo antigo **interno** é apagado do disco;
  URLs externas legadas nunca são tocadas. Falha na deleção física não é erro (arquivo
  órfão tolerado).
- **RN-005** — Deleção física só aceita paths no formato exato
  `<prefix>/avatars/<basename>` — sem path traversal.

## Critérios de aceite (cenários-chave)

1. Upload de JPEG 2 MB → 200, `avatar_url` termina em `.webp`, arquivo ≤ 512px no disco.
2. Upload de PNG renomeado de um executável (magic bytes errados) → 415.
3. Upload de 8 MB → 413; arquivo vazio → 400.
4. Professor troca avatar do seu aluno → 200; de atleta que não é seu aluno → 403.
5. Novo upload substitui: arquivo antigo some do disco, novo `avatar_url` no banco.
6. `DELETE /api/me/avatar` → `avatar_url = null` e arquivo removido.

## Fora de escopo

- Crop/edição no cliente, múltiplas resoluções, CDN/storage externo (ver ADR-006).

## Rastreabilidade

| Elemento | Código | Testes |
|---|---|---|
| Validação e processamento | `backend/app/services/avatar_storage.py` | `tests/unit/test_avatar_storage.py` |
| Rotas self | `backend/app/api/auth.py` (`/me/avatar`) | `tests/integration/test_avatar.py` |
| Rotas administrativas | `backend/app/api/athletes.py` (`/{id}/avatar`) | idem |
| UI | `frontend/components/avatar-uploader.tsx`, `lib/api.ts` (`uploadMyAvatar`, `resolveAvatarUrl`) | — |
| Servir arquivos | `app/main.py` (StaticFiles) / nginx alias em produção | — |
