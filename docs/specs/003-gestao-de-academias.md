# Spec 003 — Gestão de academias

- **Status**: Implementado
- **ADRs relacionados**: [002](../decisions/ADR-002-modelo-unico-athlete-com-roles.md)

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

## Critérios de aceite (cenários-chave)

1. Manager edita a própria academia → 200; edita outra → 403; teacher tenta editar → 403
   (guard de role).
2. Admin cria academia com gestor `1º Gub` → 422; com gestor role `teacher` → 422.
3. Associar professor `9º Gub` → 422; associar o mesmo professor duas vezes → 409.
4. Admin deleta academia com alunos → 409.
5. `GET /api/academies/public/map` sem token → 200, só ativas com lat/long.

## Fora de escopo

- Múltiplos gestores por academia; hierarquia de filiais; horários/turmas.
- **Mapa interativo na landing** (evolução planejada): a seção de academias consome o
  endpoint público e lista os dados reais, mas ainda exibe um placeholder no lugar do mapa
  gráfico — renderizar com lib de mapa (Leaflet/Google Maps) usando as coordenadas já
  retornadas fica para uma iteração futura (registrado em
  [docs/README.md § Melhorias futuras](../README.md)).

## Rastreabilidade

| Elemento | Código | Testes |
|---|---|---|
| Rotas CRUD + teachers + mapa | `backend/app/api/academies.py` | `tests/integration/test_academies.py` |
| Regra "manager só a sua" | `_check_can_manage_academy` em `academies.py` | idem |
| Modelo e derivados | `backend/app/models/academy.py`, `academy_teacher.py` | idem |
| Telas | `frontend/app/dashboard/academias/`, `components/academy-form.tsx`, `academies-table.tsx`, `academy-location-picker.tsx` | — |
| Seção de academias da landing (consome o endpoint público) | `frontend/components/academies-map.tsx` | — |
