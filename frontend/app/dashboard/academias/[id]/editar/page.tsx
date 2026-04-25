"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AcademyForm } from "@/components/academy-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

import { api, ApiError, type Academy } from "@/lib/api"

export default function EditarAcademiaPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [academy, setAcademy] = useState<Academy | null>(null)
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
      .getAcademy(id)
      .then(setAcademy)
      .catch((err) => {
        if (err instanceof ApiError) {
          if (err.status === 403) {
            router.replace("/dashboard/academias")
            return
          }
          setError(err.message)
        } else {
          setError("Erro ao carregar academia")
        }
      })
      .finally(() => setLoading(false))
  }, [params.id, router])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Academia</h1>
          <p className="text-muted-foreground">Atualize os dados da academia.</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : academy ? (
          <AcademyForm academy={academy} />
        ) : null}
      </div>
    </DashboardLayout>
  )
}
