/**
 * Integração com a Google Maps JavaScript API (ADR-009).
 *
 * A API é carregada sob demanda por <script> no browser — nenhum pacote npm
 * envolvido. Toda tela que precisa de mapa passa por `loadGoogleMaps()`, que
 * garante um único carregamento por sessão.
 */

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

/** Sem chave configurada não há mapa — a UI cai para o modo degradado. */
export const isGoogleMapsConfigured = GOOGLE_MAPS_API_KEY.length > 0

/** Brasília — centro geográfico de referência quando não há coordenadas. */
export const DEFAULT_MAP_CENTER: google.maps.LatLngLiteral = { lat: -15.7942, lng: -47.8822 }

const SCRIPT_ID = "google-maps-js-api"
const CALLBACK_NAME = "__fecotGoogleMapsReady"

let loading: Promise<void> | null = null

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Mapa só carrega no browser"))
  }
  if (window.google?.maps) {
    return Promise.resolve()
  }
  if (!isGoogleMapsConfigured) {
    return Promise.reject(
      new Error("Chave da API do Google Maps não configurada (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)"),
    )
  }
  if (loading) {
    return loading
  }

  loading = new Promise<void>((resolve, reject) => {
    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      language: "pt-BR",
      region: "BR",
      loading: "async",
      callback: CALLBACK_NAME,
    })

    const script = document.createElement("script")
    script.id = SCRIPT_ID
    script.async = true
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
    script.onerror = () => {
      // Permite nova tentativa (ex.: queda de rede) sem recarregar a página
      loading = null
      script.remove()
      delete window[CALLBACK_NAME]
      reject(new Error("Falha ao carregar a API do Google Maps"))
    }

    window[CALLBACK_NAME] = () => {
      delete window[CALLBACK_NAME]
      resolve()
    }

    document.head.appendChild(script)
  })

  return loading
}

/**
 * URL de rota no Google Maps real (app ou web), a partir da localização atual
 * de quem clicou até as coordenadas da academia.
 */
export function directionsUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${latitude},${longitude}`,
    travelmode: "driving",
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * Pino no verde da identidade (ADR-008). O marcador é desenhado em canvas pelo
 * Maps, fora do alcance do CSS, então lemos o token `--primary` em runtime —
 * assim o pino acompanha tema claro/escuro sem cor hard-coded.
 */
export function markerIcon(highlighted = false): google.maps.Icon {
  const fallback = "oklch(0.5 0.14 152)"
  const token =
    typeof window === "undefined"
      ? fallback
      : getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || fallback

  const size = highlighted ? 46 : 36
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="${size}" height="${size}">
<path d="M12 0C5.7 0 .6 5.1.6 11.4.6 20 12 32 12 32s11.4-12 11.4-20.6C23.4 5.1 18.3 0 12 0z" fill="${token}"/>
<circle cx="12" cy="11.2" r="4.2" fill="#ffffff"/>
</svg>`

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size),
  }
}
