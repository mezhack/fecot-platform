"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { MapPin } from "lucide-react"

interface AcademyLocationPickerProps {
  latitude: number
  longitude: number
  onLocationChange: (lat: number, lng: number) => void
}

export function AcademyLocationPicker({ latitude, longitude, onLocationChange }: AcademyLocationPickerProps) {
  const [selectedLat, setSelectedLat] = useState(latitude)
  const [selectedLng, setSelectedLng] = useState(longitude)

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Converter coordenadas do clique para lat/lng (simulação simplificada)
    // Em produção, usar uma biblioteca de mapas real como Leaflet ou Google Maps
    const newLat = -15.7942 + (y / rect.height - 0.5) * 2
    const newLng = -47.8822 + (x / rect.width - 0.5) * 2

    setSelectedLat(newLat)
    setSelectedLng(newLng)
    onLocationChange(newLat, newLng)
  }

  return (
    <div className="space-y-4">
      <div
        className="relative h-[400px] w-full rounded-lg border bg-muted cursor-crosshair overflow-hidden"
        onClick={handleMapClick}
      >
        {/* Placeholder para mapa - em produção, usar Leaflet ou Google Maps */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
          <div className="text-center space-y-2">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Clique no mapa para definir a localização</p>
            <p className="text-xs text-muted-foreground">
              Lat: {selectedLat.toFixed(4)}, Lng: {selectedLng.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Marcador da localização selecionada */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            transform: `translate(-50%, -50%) translate(${(selectedLng + 47.8822) * 50}px, ${(selectedLat + 15.7942) * 50}px)`,
          }}
        >
          <MapPin className="h-8 w-8 text-primary drop-shadow-lg" fill="currentColor" />
        </div>
      </div>

      <Card className="p-4 bg-muted/50">
        <div className="space-y-2 text-sm">
          <p className="font-medium">Coordenadas Selecionadas:</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">Latitude:</span>
              <p className="font-mono">{selectedLat.toFixed(6)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Longitude:</span>
              <p className="font-mono">{selectedLng.toFixed(6)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Nota: Em produção, este mapa será substituído por um mapa interativo real (Google Maps ou Leaflet)
          </p>
        </div>
      </Card>
    </div>
  )
}
