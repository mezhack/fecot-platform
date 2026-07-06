# ADR-006 — Avatares em disco local, re-encodados para WebP

- **Status**: Aceito
- **Data**: 2026-04 (registrado retroativamente em 2026-07-03)
- **Specs afetadas**: [005](../specs/005-avatares.md)

## Contexto

Única necessidade de arquivo do sistema: foto de perfil. Volume pequeno (uma imagem ≤ 512px
por atleta), deploy em VPS única com disco persistente. Um comentário antigo no modelo
("upload real fica pra depois via S3/Cloudinary") indicava intenção de storage externo;
a implementação atual decidiu diferente.

## Decisão

- Armazenar em **disco local** (`UPLOAD_DIR/avatars/`), servido sob `UPLOAD_PUBLIC_PREFIX`
  (`/uploads`) — FastAPI `StaticFiles` em dev, alias do nginx em produção.
- **Sempre re-encodar** com Pillow: validação de MIME + magic bytes, achatamento de alpha,
  redimensionamento a ≤ 512px e gravação como **WebP q85** com nome aleatório. O arquivo
  original nunca toca o disco nem é servido.
- No banco vai só o path público (`avatar_url`); URLs externas legadas (ex.: dicebear)
  continuam válidas e nunca são deletadas pelo serviço.
- Ao trocar/remover avatar, o arquivo antigo interno é apagado (falha na deleção é
  tolerada — arquivo órfão é inofensivo).

## Alternativas consideradas

- **S3/Cloudinary** — descartado por ora: custo, credenciais e latência a mais para um
  volume que cabe com folga no disco da VPS; backup dos uploads já entra no cron diário.
- **Armazenar bytes no Postgres** — descartado: incha o banco e o backup, sem benefício.
- **Servir o arquivo original enviado** — descartado por segurança: re-encode neutraliza
  payloads embutidos e uniformiza formato/tamanho.

## Consequências

- Escala limitada a uma máquina (sem CDN, sem múltiplas réplicas) — suficiente hoje;
  migrar para storage externo será um ADR novo com migração dos arquivos existentes.
- O diretório de uploads é estado persistente fora do banco: precisa de volume dedicado
  (`fecot_uploads` em dev) e entra no backup em produção (DEPLOY.md § 7.2).
- Formato de saída único (WebP) simplifica o frontend (`resolveAvatarUrl`).
