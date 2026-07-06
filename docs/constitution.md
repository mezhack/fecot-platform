# Constituição — FECOT Platform

Princípios que regem qualquer mudança neste projeto. Uma spec, ADR ou PR que viole um
destes princípios não deve ser aceita sem antes emendar formalmente este documento.

## I. Documentação é fonte de verdade

O comportamento do sistema é o que está descrito em `docs/specs/`. Código que diverge da
spec é bug (do código ou da spec — e a divergência deve ser registrada em
`docs/README.md § Divergências conhecidas` até ser resolvida). Mudanças de contrato público
(endpoint, schema, enum, regra de negócio) atualizam a documentação no mesmo commit.

## II. Autorização é responsabilidade do backend

O frontend esconde telas e botões por role apenas como UX. **Toda** regra de permissão é
imposta pela API (dependências `require_*` e métodos `can_*` do modelo `Athlete`). Nenhuma
funcionalidade pode depender de checagem só no cliente. Não há middleware de rota no
Next.js — e isso é aceitável justamente porque o backend nega tudo o que deve negar.

## III. Rastreabilidade de graduação é inviolável

A graduação de um atleta **nunca** muda por edição direta — nem por admin. Toda mudança
passa pelo fluxo `GraduationRequest` (solicitação → aprovação), preservando quem pediu,
quem aprovou, quando e por quê. Ver [ADR-003](./decisions/ADR-003-graduacao-somente-via-fluxo-aprovacao.md).

## IV. Histórico da federação é preservado

Atletas são registro histórico: remoção é restrita a admin e bloqueada quando o atleta é
professor de outros ou responsável por academia. Academias com alunos vinculados não podem
ser removidas. Preferir `active = false` a deletar.

## V. Regra de negócio nova exige teste

Toda regra de negócio (permissão, validação, transição de estado) tem teste correspondente
em `backend/tests/`. A suíte inteira passa antes de qualquer merge — zero regressões.

## VI. Erros falam a língua do usuário

Mensagens de erro da API (`detail`) são em português e acionáveis. Códigos HTTP seguem a
semântica documentada em [architecture/api.md](./architecture/api.md): 401 credencial,
403 permissão, 404 inexistente, 409 conflito de estado/unicidade, 422 validação de domínio.

## VII. Simplicidade deliberada

Monólito modular (um backend FastAPI, um frontend Next.js, um Postgres). Sem microserviços,
filas ou cache distribuído enquanto a escala não exigir. Novas dependências e novos padrões
exigem ADR.

## Emendas

Alterar um princípio exige: (1) ADR justificando; (2) atualização deste arquivo no mesmo
commit; (3) revisão das specs afetadas.
