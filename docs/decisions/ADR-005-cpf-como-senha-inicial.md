# ADR-005 — CPF como senha inicial na criação sem senha

- **Status**: Aceito
- **Data**: 2026-04 (registrado retroativamente em 2026-07-03)
- **Specs afetadas**: [001](../specs/001-autenticacao-e-conta.md), [002](../specs/002-gestao-de-atletas.md)

## Contexto

Atletas são cadastrados **por professores/gestores**, não por auto-registro — muitas vezes
em lote, no tatame, sem o atleta presente para escolher senha. Não há fluxo de e-mail
transacional (convite/definição de senha) na plataforma.

## Decisão

Em `POST /api/athletes`, se `password` não for informada e houver `cpf`, o CPF (11 dígitos)
vira a senha inicial. Sem senha e sem CPF, o atleta fica **sem `password_digest` e não
consegue logar** (registro apenas administrativo). A troca é feita pelo próprio atleta via
`PATCH /api/update_password`.

## Alternativas consideradas

- **E-mail de convite com link de definição de senha** — depende de e-mail cadastrado
  (nem todo atleta tem) e de infraestrutura de envio que o projeto ainda não possui.
- **Senha aleatória impressa/informada** — logisticamente pior no cadastro em lote e
  termina anotada em papel.
- **Bloquear login até definição de senha** — inviabiliza o primeiro acesso sem fluxo de
  e-mail.

## Consequências

- Primeiro acesso trivial de comunicar ("sua senha é seu CPF").
- Fraqueza conhecida e aceita: CPF é descobrível; a troca pós-primeiro-acesso é processual,
  o sistema **não força** (registrado em [security.md](../architecture/security.md)).
  Se um dia forçar, exige flag tipo `must_change_password` — novo ADR.
- O seed segue o mesmo padrão (senha = CPF), por isso o DEPLOY.md exige troca de todas as
  senhas seed após o deploy.
