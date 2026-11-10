"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Phone, Mail, Navigation } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { api, type Academy } from "@/lib/api"
import {
  DEFAULT_MAP_CENTER,
  directionsUrl,
  isGoogleMapsConfigured,
  loadGoogleMaps,
  markerIcon,
} from "@/lib/google-maps"

type MapStatus = "loading" | "ready" | "error" | "unconfigured"

/** Coordenadas do endpoint público vêm sempre preenchidas, mas o tipo permite null. */
function coordsOf(academy: Academy): google.maps.LatLngLiteral | null {
  if (academy.latitude === null || academy.longitude === null) return null
  return { lat: academy.latitude, lng: academy.longitude }
}

function locationLabel(academy: Academy): string {
  return [academy.city, academy.state].filter(Boolean).join(" - ")
}

/**
 * Conteúdo do balão do marcador. Montado como DOM (e não string de HTML) para
 * que nome e endereço vindos do banco nunca sejam interpretados como markup.
 */
function infoWindowContent(academy: Academy, position: google.maps.LatLngLiteral): HTMLElement {
  const root = document.createElement("div")
  root.className = "min-w-[200px] max-w-[260px] space-y-1 p-1 text-foreground"

  const title = document.createElement("p")
  title.className = "font-semibold leading-snug"
  title.textContent = academy.name
  root.appendChild(title)

  const address = [academy.address, locationLabel(academy)].filter(Boolean).join(" — ")
  if (address) {
    const line = document.createElement("p")
    line.className = "text-xs text-muted-foreground leading-snug"
    line.textContent = address
    root.appendChild(line)
  }

  if (academy.phone) {
    const line = document.createElement("p")
    line.className = "text-xs text-muted-foreground"
    line.textContent = academy.phone
    root.appendChild(line)
  }

  const link = document.createElement("a")
  link.href = directionsUrl(position.lat, position.lng)
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  link.className =
    "mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
  link.textContent = "Traçar rota no Google Maps"
  root.appendChild(link)

  return root
}

export function AcademiesMap() {
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedAcademy, setSelectedAcademy] = useState<number | null>(null)
  const [mapStatus, setMapStatus] = useState<MapStatus>(
    isGoogleMapsConfigured ? "loading" : "unconfigured",
  )

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef(new Map<number, google.maps.Marker>())
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  useEffect(() => {
    api
      .publicMapAcademies()
      .then(setAcademies)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  /** Centraliza o mapa na academia e abre o balão dela. */
  const focusAcademy = useCallback((academy: Academy) => {
    setSelectedAcademy(academy.id)

    const map = mapRef.current
    const marker = markersRef.current.get(academy.id)
    const position = coordsOf(academy)
    if (!map || !marker || !position || !infoWindowRef.current) return

    map.panTo(position)
    if ((map.getZoom() ?? 0) < 14) map.setZoom(14)
    infoWindowRef.current.setContent(infoWindowContent(academy, position))
    infoWindowRef.current.open({ map, anchor: marker })
  }, [])

  // Cria o mapa e os marcadores assim que a lista chega
  useEffect(() => {
    if (!isGoogleMapsConfigured || loading || error || academies.length === 0) return

    let cancelled = false

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return

        const map =
          mapRef.current ??
          new google.maps.Map(containerRef.current, {
            center: DEFAULT_MAP_CENTER,
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            clickableIcons: false,
            gestureHandling: "cooperative",
            maxZoom: 18,
          })
        mapRef.current = map
        infoWindowRef.current ??= new google.maps.InfoWindow({ ariaLabel: "Detalhes da academia" })

        // Recriação da lista: descarta os pinos anteriores antes de redesenhar
        for (const marker of markersRef.current.values()) marker.setMap(null)
        markersRef.current.clear()

        const bounds = new google.maps.LatLngBounds()
        for (const academy of academies) {
          const position = coordsOf(academy)
          if (!position) continue

          const marker = new google.maps.Marker({
            position,
            map,
            title: academy.name,
            icon: markerIcon(),
          })
          marker.addListener("click", () => focusAcademy(academy))
          markersRef.current.set(academy.id, marker)
          bounds.extend(position)
        }

        if (markersRef.current.size === 1) {
          map.setCenter(bounds.getCenter())
          map.setZoom(15)
        } else if (!bounds.isEmpty()) {
          map.fitBounds(bounds, 56)
        }

        setMapStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setMapStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [academies, loading, error, focusAcademy])

  // Destaca o pino da academia selecionada
  useEffect(() => {
    if (mapStatus !== "ready") return
    for (const [id, marker] of markersRef.current) {
      const highlighted = id === selectedAcademy
      marker.setIcon(markerIcon(highlighted))
      marker.setZIndex(highlighted ? 10 : 1)
    }
  }, [selectedAcademy, mapStatus])

  // Limpa marcadores e balão ao desmontar a seção
  useEffect(() => {
    const markers = markersRef.current
    return () => {
      for (const marker of markers.values()) marker.setMap(null)
      markers.clear()
      infoWindowRef.current?.close()
    }
  }, [])

  const showMapCanvas = mapStatus === "loading" || mapStatus === "ready"

  return (
    <section id="academias" className="py-20 md:py-28 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl tracking-tight mb-4">
            Academias Afiliadas
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Encontre a academia mais próxima de você e comece sua jornada no Taekwondo
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Mapa */}
          <Card className="overflow-hidden lg:sticky lg:top-24 lg:self-start p-0">
            <div className="relative h-[400px] lg:h-[600px] bg-muted">
              {showMapCanvas && <div ref={containerRef} className="absolute inset-0" />}

              {mapStatus === "loading" && !loading && academies.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Skeleton className="h-full w-full" />
                </div>
              )}

              {(mapStatus === "error" ||
                mapStatus === "unconfigured" ||
                (!loading && academies.length === 0)) && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                  <div>
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {error
                        ? "Não foi possível carregar as academias."
                        : mapStatus === "error"
                          ? "Não foi possível carregar o mapa agora."
                          : mapStatus === "unconfigured"
                            ? "Mapa indisponível no momento."
                            : "Nenhuma academia com localização cadastrada."}
                      <br />
                      <span className="text-sm">
                        {error
                          ? "Recarregue a página em alguns instantes."
                          : "Use os endereços ao lado para traçar sua rota."}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Lista de academias */}
          <div className="space-y-4">
            {loading && (
              <>
                <Skeleton className="h-44 w-full" />
                <Skeleton className="h-44 w-full" />
                <Skeleton className="h-44 w-full" />
              </>
            )}

            {!loading && error && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Não foi possível carregar as academias. Tente novamente mais tarde.
                </CardContent>
              </Card>
            )}

            {!loading && !error && academies.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma academia com localização cadastrada até o momento.
                </CardContent>
              </Card>
            )}

            {!loading &&
              !error &&
              academies.map((academy) => {
                const position = coordsOf(academy)

                return (
                  <Card
                    key={academy.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedAcademy === academy.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => focusAcademy(academy)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-start justify-between gap-4">
                        <span className="text-lg">{academy.name}</span>
                        {locationLabel(academy) && (
                          <span className="text-sm font-normal text-muted-foreground whitespace-nowrap">
                            {locationLabel(academy)}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {academy.address && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{academy.address}</span>
                        </div>
                      )}
                      {academy.manager_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Responsável:</span>
                          <span className="font-medium">{academy.manager_name}</span>
                        </div>
                      )}
                      {academy.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{academy.phone}</span>
                        </div>
                      )}
                      {academy.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{academy.email}</span>
                        </div>
                      )}

                      {position && (
                        <Button
                          asChild
                          size="sm"
                          className="mt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a
                            href={directionsUrl(position.lat, position.lng)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Navigation className="mr-2 h-4 w-4" />
                            Como chegar
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </div>
      </div>
    </section>
  )
}
