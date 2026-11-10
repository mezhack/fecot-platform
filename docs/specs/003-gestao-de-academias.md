# Spec 003 — Gestão de academias

- **Status**: Implementado
- **ADRs relacionados**: [002](../decisions/ADR-002-modelo-unico-athlete-com-roles.md),
  [009](../decisions/ADR-009-google-maps-javascript-api.md)

## Objetivo

Manter o cadastro de academias filiadas à FECOT, seu gestor responsável, o corpo de
professores (N:N) e a localização GPS para o mapa público da landing page.

## Requisitos funcionais

- **RF-001** — Listar academias (qualquer autenticado), filtros `active` e `search`
  (nome/cidade), paginação, ordenação por nome.
- **RF-002** — Consultar academia por id (autenticado), com derivados: nome/contato do
  gestor, contagem de alunos e professores, ids dos professores.
- **RF-003** — Criar academia (somente admin), com gestor obrigatório.
- **RF-004** — Editar academia (admin, ou o manager **desta** academia).
- **RF-005** — Remover academia (somente admin).
- **RF-006** — Associar e desassociar professores à academia (admin ou manager desta
  academia).
- **RF-007** — Endpoint **público** (`GET /api/academies/public/map`) para o mapa da
  landing: somente academias ativas **com latitude e longitude**.
- **RF-008** — Mapa interativo na landing (seção "Academias Afiliadas"): renderiza um
  marcador por academia retornada pelo endpoint público, com enquadramento automático em
  todas elas. Clicar em um marcador abre o balão da academia; clicar em um card da lista
  seleciona, centraliza e destaca o marcador correspondente — e vice-versa.
- **RF-009** — Rota até a academia: tanto o card quanto o balão do marcador oferecem
  **"Como chegar"**, que abre o **Google Maps real** em nova aba, já com a academia como
  destino, para o visitante traçar a rota a partir de onde está.
- **RF-010** — Seletor de localização no cadastro (criar/editar academia): mapa em que o
  admin/gestor clica para definir as coordenadas e arrasta o marcador para ajustar. Os
  campos de latitude e longitude continuam editáveis à mão e ficam sincronizados com o
  mapa nos dois sentidos.

## Regras de negócio

- **RN-001** — Toda academia tem exatamente um gestor (`manager_id NOT NULL`); o gestor
  deve existir, ter role `academy_manager` ou `admin` e graduação ≥ 1º Dan (422).
- **RN-002** — Manager só gerencia (edita/associa professores) academias das quais é o
  responsável — tentar em outra retorna 403, mesmo tendo o role certo.
- **RN-003** — CNPJ único quando preenchido (409).
- **RN-004** — Professor associado deve ter role teacher+ e graduação ≥ 1º Dan (422);
  associação duplicada retorna 409; remover vínculo inexistente retorna 404.
- **RN-005** — Não se remove academia com alunos vinculados (`home_academy_id`) — 409.
  Sem alunos, a remoção desfaz vínculos N:N e o banco impede órfãos de manager (RESTRICT).
- **RN-006** — O endpoint público expõe apenas academias `active=true` com coordenadas —
  academias sem GPS simplesmente não aparecem no mapa.
- **RN-007** — O mapa é um recurso **não essencial**: sem `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  configurada, ou se o script do Google falhar, a seção degrada para lista + links de rota
  (que não dependem de chave) e o cadastro cai nos campos manuais de latitude/longitude.
  Nenhuma dessas situações pode quebrar a página (ADR-009).

## Critérios de aceite (cenários-chave)

1. Manager edita a própria academia → 200; edita outra → 403; teacher tenta editar → 403
   (guard de role).
2. Admin cria academia com gestor `1º Gub` → 422; com gestor role `teacher` → 422.
3. Associar professor `9º Gub` → 422; associar o mesmo professor duas vezes → 409.
4. Admin deleta academia com alunos → 409.
5. `GET /api/academies/public/map` sem token → 200, só ativas com lat/long.
6. Visitante clica no card de uma academia → o mapa centraliza nela e o marcador é
   destacado; clica em "Como chegar" → abre o Google Maps em nova aba com o destino
   preenchido, sem afetar a seleção na página.
7. Build sem `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` → a seção carrega, o painel do mapa exibe
   aviso e a lista com os links de rota continua utilizável (RN-007).
8. Admin clica em um ponto do mapa no cadastro → latitude e longitude assumem exatamente
   aquele ponto (6 casas decimais); digitar as coordenadas à mão reposiciona o marcador.

## Fora de escopo

- Múltiplos gestores por academia; hierarquia de filiais; horários/turmas.
- Busca de endereço/geocodificação no cadastro (converter CEP ou endereço em coordenadas):
  hoje a posição é definida por clique no mapa ou digitada.
- Cálculo de distância/rota dentro da plataforma — o trajeto é delegado ao Google Maps.

## Rastreabilidade

| Elemento | Código | Testes |
|---|---|---|
| Rotas CRUD + teachers + mapa | `backend/app/api/academies.py` | `tests/integration/test_academies.py` |
| Regra "manager só a sua" | `_check_can_manage_academy` em `academies.py` | idem |
| Modelo e derivados | `backend/app/models/academy.py`, `academy_teacher.py` | idem |
| Telas | `frontend/app/dashboard/academias/`, `components/academy-form.tsx`, `academies-table.tsx` | — |
| RF-008/RF-009 — mapa e rota na landing | `frontend/components/academies-map.tsx` | — |
| RF-010 — seletor de localização no cadastro | `frontend/components/academy-location-picker.tsx` | — |
| Carregamento da API do Maps, URL de rota e pino | `frontend/lib/google-maps.ts`, `frontend/types/google-maps.d.ts` | — |
