"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Phone, Mail } from "lucide-react"
import { useEffect, useState } from "react"

import { api, type Academy } from "@/lib/api"

export function AcademiesMap() {
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedAcademy, setSelectedAcademy] = useState<number | null>(null)

  useEffect(() => {
    api
      .publicMapAcademies()
      .then(setAcademies)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

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
          {/* Map Placeholder */}
          <Card className="overflow-hidden">
            <div className="relative h-[400px] lg:h-[600px] bg-muted flex items-center justify-center">
              <div className="text-center p-6">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Mapa interativo das academias
                  <br />
                  <span className="text-sm">(em breve)</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Academies List */}
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
              academies.map((academy) => (
                <Card
                  key={academy.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedAcademy === academy.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedAcademy(academy.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between gap-4">
                      <span className="text-lg">{academy.name}</span>
                      {(academy.city || academy.state) && (
                        <span className="text-sm font-normal text-muted-foreground whitespace-nowrap">
                          {[academy.city, academy.state].filter(Boolean).join(" - ")}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {academy.manager_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
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
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </div>
    </section>
  )
}
