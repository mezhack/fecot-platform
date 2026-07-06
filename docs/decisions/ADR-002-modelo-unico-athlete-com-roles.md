# ADR-002 — Modelo único `Athlete` com enum de roles

- **Status**: Aceito
- **Data**: 2026-04 (registrado retroativamente em 2026-07-03)
- **Specs afetadas**: [001](../specs/001-autenticacao-e-conta.md), [002](../specs/002-gestao-de-atletas.md)

## Contexto

Professores, gestores e administradores da federação **são também atletas** — têm
graduação, academia, histórico. Modelar "usuário" separado de "atleta" duplicaria os mesmos
campos e criaria sincronização artificial.

## Decisão

Uma única tabela `athletes` para todos os usuários, com papel no enum `role`
(`athlete | teacher | academy_manager | admin`). Os relacionamentos expressam as funções:

- `professor_id` (auto-relação): professor individual de um aluno.
- `academy_teachers` (N:N): onde um teacher ensina.
- `Academy.manager_id`: qual academia o manager gerencia.

Helpers hierárquicos no modelo (`is_teacher` inclui manager e admin; `is_academy_manager`
inclui admin) — permissões maiores englobam as menores.

## Alternativas consideradas

- **Tabelas User + Athlete separadas** — descartado: todo usuário do domínio é atleta;
  a separação só adicionaria joins e estados inconsistentes.
- **Múltiplos roles por usuário (N:N de papéis)** — descartado por ora: o domínio real da
  federação não apresentou o caso; um professor que também gerencia academia usa o role
  `academy_manager`, que já engloba as capacidades de teacher.

## Consequências

- Elegibilidade vira regra de aplicação, não de schema: `teacher`/`academy_manager` exigem
  ≥ 1º Dan (422 na violação), validado na criação/edição e na associação a academias.
- Um único fluxo de login/JWT para todos os perfis; o frontend deriva a navegação do `role`.
- Cuidado permanente: checagens de permissão devem usar os helpers hierárquicos
  (`is_teacher`, `is_academy_manager`), nunca comparação direta de role — exceto quando a
  regra é exclusiva de admin.
