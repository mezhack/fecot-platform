# Decisões Arquiteturais (ADRs)

Registro das decisões que moldam o projeto e seus porquês. Uma decisão aceita só deixa de
valer quando outro ADR a **substitui** explicitamente (status `Substituído por ADR-XXX`).

## Índice

| ADR | Decisão | Status |
|---|---|---|
| [001](./ADR-001-reescrita-fastapi-nextjs.md) | Reescrita completa: Rails → FastAPI + Next.js | Aceito |
| [002](./ADR-002-modelo-unico-athlete-com-roles.md) | Modelo único `Athlete` com enum de roles | Aceito |
| [003](./ADR-003-graduacao-somente-via-fluxo-aprovacao.md) | Graduação muda **somente** via fluxo de aprovação | Aceito |
| [004](./ADR-004-jwt-stateless-localstorage.md) | JWT stateless com armazenamento em localStorage | Aceito |
| [005](./ADR-005-cpf-como-senha-inicial.md) | CPF como senha inicial na criação sem senha | Aceito |
| [006](./ADR-006-avatares-disco-local-webp.md) | Avatares em disco local, re-encodados para WebP | Aceito |
| [007](./ADR-007-graduacoes-strings-canonicas.md) | Graduações como strings canônicas espelhadas front/back | Aceito |
| [008](./ADR-008-identidade-visual-verde-amarela.md) | Identidade visual verde/amarela (bandeira) + logo do tigre | Aceito |

## Quando escrever um ADR

- Nova dependência relevante, novo padrão ou novo serviço.
- Mudança breaking de contrato público (API, schema, enum).
- Escolha com trade-off real (fizemos X em vez de Y — e alguém no futuro vai perguntar por quê).
- Exceção a um princípio da [constitution](../constitution.md) (que também exige emenda lá).

Use o [TEMPLATE.md](./TEMPLATE.md). Numeração sequencial, nome no formato
`ADR-NNN-slug-curto.md`. ADRs nunca são apagados — são substituídos.
