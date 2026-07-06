# ADR-008 — Identidade visual verde/amarela (rebranding 2026-07)

- **Status**: Aceito
- **Data**: 2026-07-06
- **Specs afetadas**: nenhuma (mudança visual, sem alteração de contrato ou comportamento)

## Contexto

A FECOT adotou uma nova logo (tigre sobre as bandeiras da Coreia e do Brasil, letras
vermelhas) e pediu que a plataforma abandonasse a identidade anterior (vermelho/preto,
logo do chute no círculo vermelho) em favor das cores da bandeira do Brasil.

## Decisão

- **Paleta pelos tokens** (`frontend/app/globals.css`, oklch, light + dark):
  - `primary` = verde bandeira (ações, links, botões);
  - `accent` = verde mata profundo (painéis de marca: hero, laterais de auth);
  - `faixa` (token novo) = amarelo bandeira — usado **apenas em pontos de decisão**:
    CTA principal do hero, item ativo da sidebar, bullets dos painéis de auth e o divisor
    de marca. Badges e superfícies neutras não usam amarelo;
  - o vermelho da logo vive no `destructive`; azul da bandeira e laranja do tigre só nos
    tons de gráfico (`chart-3`/`chart-4`);
  - sidebar do dashboard usa os tokens `sidebar-*` em verde mata, com item ativo em
    amarelo.
- **Assinatura visual**: o divisor `.faixa-divider` — banda amarela com ponta verde,
  referência direta à graduação "Amarela Ponta Verde" (7º Gub) do próprio domínio.
  Aparece sob o header público, no topo do footer e sob o bloco de logo da sidebar.
- **Logo**: asset local `frontend/public/logo-fecot.png` (aparada, PNG real) substitui a
  URL externa da Vercel em todos os pontos; favicon `frontend/app/icon.png` é o recorte
  da cabeça do tigre. Como a arte tem fundo branco, sobre painéis verdes ela é exibida em
  placa branca arredondada.
- **Tipografia**: mantida a Bebas Neue como display (compatível com o letreiro condensado
  da logo) + Inter no corpo. Corrigido de tabela o `--font-sans`, que apontava para
  "Geist" (fonte nunca carregada) em vez da Inter declarada no layout.

## Alternativas consideradas

- **Amarelo como `secondary` global** — descartado: `secondary` é usado em badges e chips
  discretos por todo o dashboard; amarelo ali destruiria a hierarquia visual.
- **Vermelho da logo como `primary`** — descartado: o pedido foi verde/amarelo; o vermelho
  permanece com o significado que já tinha na UI (ações destrutivas).
- **Lib de mapa/gradientes decorativos por toda parte** — descartado por contenção; a
  identidade se concentra na paleta, na logo e no divisor de faixa.

## Consequências

- Qualquer ajuste futuro de cor é feito nos tokens do `globals.css` — nenhum componente
  tem cor hard-coded fora deles (exceção consciente: `bg-white` das placas de logo).
- O token `faixa` é parte do vocabulário do design; novos usos de amarelo devem passar
  por ele e respeitar a regra "só em pontos de decisão".
- A logo com fundo branco limita composições sobre superfícies escuras à placa branca;
  uma versão com fundo transparente permitiria remover as placas (evolução desejável).
