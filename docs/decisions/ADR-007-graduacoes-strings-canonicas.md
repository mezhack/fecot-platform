# ADR-007 — Graduações como strings canônicas espelhadas front/back

- **Status**: Aceito
- **Data**: 2026-04 (registrado retroativamente em 2026-07-03)
- **Specs afetadas**: [002](../specs/002-gestao-de-atletas.md), [004](../specs/004-fluxo-de-graduacao.md)

## Contexto

O taekwondo tem 20 graduações ordenadas (`10º Gub` … `1º Gub`, `1º Dan` … `10º Dan`).
Era preciso representá-las no banco, validar entradas e exibi-las — decidindo entre enum
de banco, tabela de domínio ou lista canônica em código.

## Decisão

- `graduation` é `varchar(32)` contendo **exatamente** uma das 20 strings da lista
  canônica em `backend/app/core/graduations.py` (portada do Rails original).
- Validação na borda: o Pydantic rejeita (422) qualquer valor fora da lista.
- O frontend mantém **espelho manual** em `frontend/lib/graduations.ts` (mesmas strings,
  na mesma ordem, + labels com a cor da faixa). **Regra: os dois arquivos mudam no mesmo
  commit.**
- Regras derivadas por convenção da string: `is_dan_rank` (contém "Dan"),
  `can_be_professor` (regex `^([1-9]|10)º Dan$`).

## Alternativas consideradas

- **Enum nativo do Postgres** — descartado: alterar enum exige migration chata, e o valor
  com caracteres especiais (`º`) ficaria igualmente acoplado; a string + validação Pydantic
  dá a mesma garantia na prática, já que toda escrita passa pela API.
- **Tabela `graduations` com FK** — descartado: lista imutável de 20 valores ordenados não
  justifica join em toda consulta nem CRUD de domínio.
- **Gerar tipos TS a partir do backend (OpenAPI codegen)** — desejável no futuro, mas
  adicionaria toolchain; hoje o espelho manual com regra de commit conjunto resolve.

## Consequências

- Legibilidade máxima: banco e API falam a língua do domínio (`"3º Gub"`).
- Risco assumido: divergência silenciosa entre as duas listas se a regra do commit conjunto
  for ignorada — mitigável futuramente com teste de contrato ou codegen.
- Comparações de ordem entre graduações dependem do índice na lista, não da string —
  qualquer lógica de "graduação maior que" deve usar `GRADUATIONS.index()`.
