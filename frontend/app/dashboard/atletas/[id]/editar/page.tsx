"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AthleteForm } from "@/components/athlete-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

import { api, ApiError, type Athlete } from "@/lib/api"

export default function EditarAtletaPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = Number(params.id)
    if (!id) {
      setError("ID inválido")
      setLoading(false)
      return
    }
    api
      .getAthlete(id)
      .then(setAthlete)
      .catch((err) => {
        if (err instanceof ApiError) {
          if (err.status === 403) {
            // Backend já bloqueou — redireciona
            router.replace("/dashboard/atletas")
            return
          }
          setError(err.message)
        } else {
          setError("Erro ao carregar atleta")
        }
      })
      .finally(() => setLoading(false))
  }, [params.id, router])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Atleta</h1>
          <p className="text-muted-foreground">
            Atualize os dados cadastrais. Mudanças de graduação passam pelo fluxo de aprovação.
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : athlete ? (
          <AthleteForm athlete={athlete} />
        ) : null}
      </div>
    </DashboardLayout>
  )
}
