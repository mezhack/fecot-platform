/**
 * Tipagem mínima da Google Maps JavaScript API — só o que a plataforma usa.
 * A API entra por <script> em runtime (ADR-009), então não existe pacote
 * `@types/google.maps` instalado. Ao usar uma API nova do Maps, declare-a aqui.
 */

declare namespace google.maps {
  interface LatLngLiteral {
    lat: number
    lng: number
  }

  class LatLng {
    constructor(lat: number, lng: number)
    lat(): number
    lng(): number
  }

  class LatLngBounds {
    constructor()
    extend(point: LatLng | LatLngLiteral): LatLngBounds
    isEmpty(): boolean
    getCenter(): LatLng
  }

  interface Padding {
    top: number
    right: number
    bottom: number
    left: number
  }

  interface MapOptions {
    center?: LatLngLiteral
    zoom?: number
    mapTypeControl?: boolean
    streetViewControl?: boolean
    fullscreenControl?: boolean
    zoomControl?: boolean
    clickableIcons?: boolean
    gestureHandling?: "cooperative" | "greedy" | "none" | "auto"
    maxZoom?: number
    minZoom?: number
  }

  class Map {
    constructor(element: HTMLElement, options?: MapOptions)
    setCenter(latLng: LatLng | LatLngLiteral): void
    setZoom(zoom: number): void
    getZoom(): number | undefined
    panTo(latLng: LatLng | LatLngLiteral): void
    fitBounds(bounds: LatLngBounds, padding?: number | Padding): void
    addListener(eventName: string, handler: (event: MapMouseEvent) => void): MapsEventListener
  }

  interface MapMouseEvent {
    latLng: LatLng | null
  }

  interface MapsEventListener {
    remove(): void
  }

  class Size {
    constructor(width: number, height: number)
  }

  class Point {
    constructor(x: number, y: number)
  }

  interface Icon {
    url: string
    scaledSize?: Size
    anchor?: Point
  }

  enum Animation {
    BOUNCE,
    DROP,
  }

  interface MarkerOptions {
    position: LatLngLiteral
    map?: Map | null
    title?: string
    icon?: Icon | string
    draggable?: boolean
    zIndex?: number
    animation?: Animation
  }

  class Marker {
    constructor(options?: MarkerOptions)
    setMap(map: Map | null): void
    setPosition(latLng: LatLngLiteral): void
    getPosition(): LatLng | null
    setIcon(icon: Icon | string): void
    setZIndex(zIndex: number): void
    addListener(eventName: string, handler: (event: MapMouseEvent) => void): MapsEventListener
  }

  interface InfoWindowOptions {
    content?: Node | string
    ariaLabel?: string
  }

  class InfoWindow {
    constructor(options?: InfoWindowOptions)
    open(options: { map: Map; anchor?: Marker }): void
    close(): void
    setContent(content: Node | string): void
  }
}

interface Window {
  google?: typeof google
  __fecotGoogleMapsReady?: () => void
}
