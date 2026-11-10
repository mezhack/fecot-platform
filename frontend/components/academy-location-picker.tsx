"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { MapPin } from "lucide-react"

import {
  DEFAULT_MAP_CENTER,
  isGoogleMapsConfigured,
  loadGoogleMaps,
  markerIcon,
} from "@/lib/google-maps"

interface AcademyLocationPickerProps {
  latitude: number | null
  longitude: number | null
  onLocationChange: (lat: number, lng: number) => void
}

type PickerStatus = "loading" | "ready" | "error" | "unconfigured"

/** Precisão de ~11 cm — mais casas decimais só poluem o formulário. */
const round = (value: number) => Number(value.toFixed(6))

export function AcademyLocationPicker({
  latitude,
  longitude,
  onLocationChange,
}: AcademyLocationPickerProps) {
  const [status, setStatus] = useState<PickerStatus>(
    isGoogleMapsConfigured ? "loading" : "unconfigured",
  )

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)

  // Refs evitam recriar o mapa a cada render do formulário
  const onLocationChangeRef = useRef(onLocationChange)
  const initialPositionRef = useRef(
    latitude !== null && longitude !== null ? { lat: latitude, lng: longitude } : null,
  )

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange
  }, [onLocationChange])

  // Monta o mapa uma única vez
  useEffect(() => {
    if (!isGoogleMapsConfigured) return

    let cancelled = false

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return

        const initial = initialPositionRef.current
        const map = new google.maps.Map(containerRef.current, {
          center: initial ?? DEFAULT_MAP_CENTER,
          zoom: initial ? 16 : 4,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          maxZoom: 20,
        })

        map.addListener("click", (event) => {
          if (!event.latLng) return
          onLocationChangeRef.current(round(event.latLng.lat()), round(event.latLng.lng()))
        })

        mapRef.current = map
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Marcador sempre espelha as coordenadas do formulário
  useEffect(() => {
    const map = mapRef.current
    if (status !== "ready" || !map) return

    if (latitude === null || longitude === null) {
      markerRef.current?.setMap(null)
      markerRef.current = null
      return
    }

    const position = { lat: latitude, lng: longitude }

    if (markerRef.current) {
      markerRef.current.setPosition(position)
    } else {
      const marker = new google.maps.Marker({
        position,
        map,
        draggable: true,
        icon: markerIcon(true),
        title: "Arraste para ajustar a localização",
      })
      marker.addListener("dragend", (event) => {
        if (!event.latLng) return
        onLocationChangeRef.current(round(event.latLng.lat()), round(event.latLng.lng()))
      })
      markerRef.current = marker
    }

    map.panTo(position)
    if ((map.getZoom() ?? 0) < 14) map.setZoom(16)
  }, [latitude, longitude, status])

  // Remove o marcador ao desmontar o formulário
  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null)
      markerRef.current = null
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="relative h-[400px] w-full overflow-hidden rounded-lg border bg-muted">
        {status !== "unconfigured" && (
          <div ref={containerRef} className="absolute inset-0 cursor-crosshair" />
        )}

        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="space-y-2 text-center">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {status === "loading"
                  ? "Carregando o mapa..."
                  : status === "error"
                    ? "Não foi possível carregar o mapa."
                    : "Mapa indisponível."}
              </p>
              {status !== "loading" && (
                <p className="text-xs text-muted-foreground">
                  Informe latitude e longitude manualmente nos campos do formulário.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <Card className="bg-muted/50 p-4">
        <div className="space-y-2 text-sm">
          <p className="font-medium">
            {status === "ready"
              ? "Clique no mapa para definir a localização — ou arraste o marcador para ajustar."
              : "Coordenadas da academia"}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">Latitude:</span>
              <p className="font-mono">{latitude !== null ? latitude.toFixed(6) : "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Longitude:</span>
              <p className="font-mono">{longitude !== null ? longitude.toFixed(6) : "—"}</p>
            </div>
          </div>
          {latitude === null && longitude === null && (
            <p className="pt-1 text-xs text-muted-foreground">
              Sem coordenadas, a academia não aparece no mapa público da home.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
