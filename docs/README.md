# Documentação — FECOT Platform

Documentação da plataforma da **Federação Centro-Oeste de Taekwondo**, organizada no padrão
**SDD (Spec-Driven Development)**: as especificações são a fonte de verdade do comportamento
do sistema, e o código deve refletir o que está documentado aqui.

## Mapa da documentação

| Área | Conteúdo |
|---|---|
| [constitution.md](./constitution.md) | Princípios inegociáveis do projeto — regem qualquer mudança |
| [specs/](./specs/) | Especificações funcionais por domínio (fonte de verdade do comportamento) |
| [architecture/](./architecture/) | Visão técnica: containers, camadas, modelo de dados, contrato de API, segurança |
| [decisions/](./decisions/) | ADRs — registros de decisões arquiteturais e seus porquês |
| [../README.md](../README.md) | Visão geral, setup local, credenciais de seed |
| [../DEPLOY.md](../DEPLOY.md) | Guia de deploy em produção (Hostinger VPS) |
| [../backend/tests/README.md](../backend/tests/README.md) | Como rodar a suíte de testes (105 testes) |

## Especificações (specs)

| Spec | Domínio | Status |
|---|---|---|
| [001 — Autenticação e conta](./specs/001-autenticacao-e-conta.md) | Login, sessão, auto-edição, senha | Implementado |
| [002 — Gestão de atletas](./specs/002-gestao-de-atletas.md) | CRUD administrativo de atletas | Implementado |
| [003 — Gestão de academias](./specs/003-gestao-de-academias.md) | CRUD de academias, professores N:N, mapa público | Implementado |
| [004 — Fluxo de graduação](./specs/004-fluxo-de-graduacao.md) | Solicitação e aprovação de mudança de graduação | Implementado |
| [005 — Avatares](./specs/005-avatares.md) | Upload e processamento de foto de perfil | Implementado |

## O fluxo SDD deste projeto

Toda mudança de comportamento segue esta ordem — **spec antes de código**:

1. **Especificar** — criar ou atualizar a spec em `docs/specs/`. Se a mudança envolve uma
   decisão arquitetural (nova dependência, mudança de contrato, novo padrão), registrar um
   ADR em `docs/decisions/` antes de implementar.
2. **Validar** — a spec não pode contradizer a [constitution](./constitution.md) nem ADRs
   aceitos. Se contradisser um ADR, o ADR precisa ser formalmente substituído (superseded).
3. **Implementar** — o código implementa exatamente o que a spec descreve. Regras de negócio
   novas exigem testes correspondentes em `backend/tests/`.
4. **Sincronizar** — se a implementação mudar um contrato público (endpoint, schema, enum,
   comportamento), a spec, o [contrato de API](./architecture/api.md) e o README são
   atualizados **no mesmo commit**.

### Convenções das specs

- Requisitos funcionais numerados `RF-XXX`, regras de negócio `RN-XXX` — estáveis dentro de
  cada spec (não renumerar ao remover; marcar como revogado).
- Cada spec termina com uma seção de **rastreabilidade** ligando requisitos a arquivos de
  código e testes.
- Status possíveis: `Rascunho` → `Aprovado` → `Implementado` → `Obsoleto`.

## Divergências conhecidas (código × documentação)

**Nenhuma em aberto.** As quatro divergências encontradas na auditoria de 2026-07-03 foram
resolvidas em 2026-07-06: a landing passou a consumir `GET /api/academies/public/map`
(dados reais), a página de recuperar senha deixou de ser stub e passou a orientar o fluxo
real (redefinição via professor/gestor/admin), `datetime.utcnow()` foi substituído por
`datetime.now(UTC)` e o diretório residual `backend/{app` foi removido.

Ao encontrar uma nova divergência, registre-a aqui (numerada, com arquivo e comportamento
esperado) até que seja resolvida — nunca corrija silenciosamente.

## Melhorias futuras registradas (não são divergências)

- **Mapa interativo na landing** — a seção de academias hoje mostra a lista real vinda da
  API com um placeholder visual no lugar do mapa; a renderização em mapa de verdade
  (Leaflet/Google Maps, usando as coordenadas já expostas pelo endpoint) fica como evolução
  planejada da [spec 003](./specs/003-gestao-de-academias.md).
- **Recuperação de senha self-service** — exigiria infraestrutura de email; o fluxo atual
  (responsável redefine) está documentado na [spec 001](./specs/001-autenticacao-e-conta.md).
