# ADR-004 — JWT stateless com armazenamento em localStorage

- **Status**: Aceito
- **Data**: 2026-04 (registrado retroativamente em 2026-07-03)
- **Specs afetadas**: [001](../specs/001-autenticacao-e-conta.md)

## Contexto

API e frontend rodam como aplicações separadas (ADR-001), possivelmente em domínios
distintos em produção. Era preciso um mecanismo de sessão simples, sem estado no servidor.

## Decisão

- **JWT HS256** assinado com `JWT_SECRET`, validade de 24h, claims `sub` (id do atleta),
  `role`, `iat`, `exp`. Sem refresh token e sem lista de revogação.
- Token e usuário cacheado guardados em **localStorage** (`fecot_token`, `fecot_user`);
  o hook `useAuth` mostra o usuário em cache de forma otimista e revalida com `GET /api/me`
  ao montar — token inválido limpa o storage.
- O backend recarrega o atleta do banco a cada requisição: **desativar a conta corta o
  acesso imediatamente**, mesmo com token não expirado. O claim `role` é informativo; a
  autorização usa sempre o role atual do banco.

## Alternativas consideradas

- **Cookie httpOnly + sessão server-side** — mais resistente a XSS, mas exige gestão de
  sessão/CSRF e configuração de cookies cross-origin entre os dois deploys; complexidade
  julgada desnecessária para o porte atual.
- **Refresh tokens** — adiado: com 24h de validade e corte imediato via `active=false`,
  o ganho não justificava o segundo fluxo de token agora.

## Consequências

- Logout é client-side (limpar storage); um token roubado vale até expirar — mitigação:
  desativar a conta (ver [security.md § limitações](../architecture/security.md)).
- localStorage é legível por qualquer script na página — a proteção real é não ter XSS;
  atenção redobrada ao introduzir scripts de terceiros.
- Qualquer mudança aqui (cookies, refresh, revogação) é breaking para o frontend inteiro
  e exige novo ADR.
