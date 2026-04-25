"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Phone, Mail } from "lucide-react"
import { useState } from "react"

// Mock data - will be replaced with real data from backend
const academies = [
  {
    id: 1,
    name: "Academia Dragão Vermelho",
    city: "Goiânia",
    state: "GO",
    responsible: "Mestre João Silva",
    phone: "(62) 99999-9999",
    email: "dragao@email.com",
    lat: -16.6869,
    lng: -49.2648,
  },
  {
    id: 2,
    name: "Centro de Treinamento Tigre",
    city: "Brasília",
    state: "DF",
    responsible: "Mestre Maria Santos",
    phone: "(61) 98888-8888",
    email: "tigre@email.com",
    lat: -15.7801,
    lng: -47.9292,
  },
  {
    id: 3,
    name: "Academia Leão Dourado",
    city: "Cuiabá",
    state: "MT",
    responsible: "Mestre Pedro Costa",
    phone: "(65) 97777-7777",
    email: "leao@email.com",
    lat: -15.6014,
    lng: -56.0979,
  },
  {
    id: 4,
    name: "Escola de Taekwondo Águia",
    city: "Campo Grande",
    state: "MS",
    responsible: "Mestre Ana Oliveira",
    phone: "(67) 96666-6666",
    email: "aguia@email.com",
    lat: -20.4697,
    lng: -54.6201,
  },
]

export function AcademiesMap() {
  const [selectedAcademy, setSelectedAcademy] = useState<number | null>(null)

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
                  <span className="text-sm">(Integração com Google Maps)</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Academies List */}
          <div className="space-y-4">
            {academies.map((academy) => (
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
                    <span className="text-sm font-normal text-muted-foreground whitespace-nowrap">
                      {academy.city} - {academy.state}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Responsável:</span>
                    <span className="font-medium">{academy.responsible}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{academy.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{academy.email}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
