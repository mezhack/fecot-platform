# ADR-003 — Graduação muda somente via fluxo de aprovação

- **Status**: Aceito
- **Data**: 2026-04 (registrado retroativamente em 2026-07-03)
- **Specs afetadas**: [002](../specs/002-gestao-de-atletas.md), [004](../specs/004-fluxo-de-graduacao.md)

## Contexto

A graduação é o dado mais sensível da federação: define elegibilidade para papéis,
categorias de competição e a própria credibilidade do registro. Edição direta permitiria
mudanças sem histórico de quem pediu, quem autorizou e por quê.

## Decisão

O campo `graduation` **não existe** no schema de atualização de atleta (`AthleteUpdate`) —
nem admin consegue alterá-lo por PATCH/PUT. Toda mudança passa pelo fluxo
`GraduationRequest`:

1. Professor individual, manager da academia ou admin cria a solicitação
   (`from_graduation` é snapshot automático da graduação atual).
2. Apenas admin aprova (aplica a nova graduação) ou rejeita.
3. Ficam registrados: solicitante, revisor, timestamps, justificativa e notas de revisão.
4. Uma única solicitação pendente por atleta (409 na duplicata).

Este princípio está elevado à [constitution § III](../constitution.md).

## Alternativas consideradas

- **Admin pode editar direto** (comportamento documentado numa fase inicial do README,
  já corrigido) — descartado na implementação final: admin com atalho quebra a auditoria
  justamente no caso mais poderoso. Admin cria a request e a aprova ele mesmo, mantendo
  o rastro.
- **Log de auditoria genérico + edição livre** — descartado: log passivo não impõe o fluxo
  de aprovação; a federação quer o gate, não só o registro.

## Consequências

- Rastreabilidade completa e imposta por design — não há caminho alternativo na API.
- Custo operacional: até uma correção de erro de digitação exige request + aprovação.
- O snapshot `from_graduation` congela o estado no momento do pedido; se a graduação mudar
  entre pedido e revisão (só possível via outra request — bloqueada pelo limite de uma
  pendente), o histórico permanece coerente.
