# ADR-009 — Google Maps JavaScript API para o mapa de academias

- **Status**: Aceito
- **Data**: 2026-07-24
- **Specs afetadas**: [003 — Gestão de academias](../specs/003-gestao-de-academias.md)

## Contexto

O endpoint público `GET /api/academies/public/map` já devolvia as academias ativas com
latitude e longitude desde a implementação da spec 003, mas a landing exibia um placeholder
no lugar do mapa e o seletor de localização do cadastro simulava as coordenadas por uma
conta sobre a posição do clique — gerando valores sem relação com o ponto real.

O pedido para fechar essa lacuna trouxe um requisito novo: além de mostrar as academias no
mapa, cada uma precisa levar ao **Google Maps de verdade**, para que o visitante trace a
rota até a academia escolhida.

## Decisão

Usar a **Google Maps JavaScript API**, carregada por `<script>` em runtime.

- Carregamento centralizado em `frontend/lib/google-maps.ts` (`loadGoogleMaps()`), com uma
  única injeção de script por sessão e callback `loading=async`, em `pt-BR`/`BR`.
- **Sem pacote npm**: a API entra pelo browser e a tipagem fica em
  `frontend/types/google-maps.d.ts`, declarando à mão apenas a superfície usada. Ao usar uma
  API nova do Maps, declare o tipo lá.
- Chave em `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Por ser `NEXT_PUBLIC_*`, ela é **embutida no
  bundle em tempo de build** — logo, é build-arg no `frontend/Dockerfile` e precisa estar
  presente no build de produção, não só no runtime. A proteção correta para esse tipo de
  chave é a restrição por referenciador HTTP no Google Cloud, não o sigilo.
- **Rota**: link para `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` —
  URL pública, sem chave e sem custo, que abre o app do Google Maps no celular e o site no
  desktop. Está em cada card da lista e no balão de cada marcador.
- **Degradação graciosa**: sem chave configurada, ou se o script falhar, a seção continua
  funcionando — some o mapa, permanecem a lista real e os links de rota. O site nunca
  quebra por causa do mapa.
- Marcadores usam `google.maps.Marker` com pino SVG na cor lida do token `--primary` em
  runtime, respeitando a identidade e o tema claro/escuro (ADR-008).

## Alternativas consideradas

- **Leaflet + OpenStreetMap** — não exige chave nem billing e seria a opção mais barata, mas
  entra como dependência npm (ou CDN) e entrega tiles com qualidade e cobertura inferiores
  às do Google no Centro-Oeste. Descartada por escolha explícita do produto pelo Google Maps.
- **`AdvancedMarkerElement`** (marcador recomendado hoje) — exige criar um **Map ID** no
  Google Cloud além da chave. Ficou de fora para manter a configuração em um único passo;
  `google.maps.Marker` está depreciado desde 2024-02, mas segue suportado com aviso prévio
  de 12 meses. Se o Google anunciar a retirada, migrar para `AdvancedMarkerElement` + Map ID.
- **Embed do Google Maps por `<iframe>`** — mais simples, porém aceita um marcador por vez e
  não permite destacar a academia selecionada nem reagir a cliques na lista.

## Consequências

- O mapa passa a depender de uma conta Google Cloud com billing e da "Maps JavaScript API"
  habilitada. O uso da landing cabe no nível gratuito, mas **a chave precisa de restrição
  por referenciador** — sem isso, terceiros podem consumir a cota do projeto.
- A tipagem manual em `types/google-maps.d.ts` precisa acompanhar qualquer uso novo da API;
  em compensação, o projeto não ganhou dependência npm nova.
- Deploys precisam passar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` no **build** (documentado em
  `DEPLOY.md`); esquecer disso derruba o mapa para o modo degradado silenciosamente.
- Academias sem coordenadas continuam fora do mapa (RN-006) — a lista do dashboard agora
  deixa isso explícito no seletor de localização.
