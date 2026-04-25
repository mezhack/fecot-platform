"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Send } from "lucide-react"

import { GRADUATIONS } from "@/lib/graduations"
import { api, ApiError, type Athlete } from "@/lib/api"

export function GraduationRequestForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedAthleteId = searchParams.get("athlete_id")

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [athleteId, setAthleteId] = useState(preselectedAthleteId ?? "")
  const [toGraduation, setToGraduation] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        setAthletes(await api.listAthletes())
      } catch {
        /* silencioso */
      }
    })()
  }, [])

  const selected = athletes.find((a) => String(a.id) === athleteId)

  // Filtra graduações: só permite ir PRA FRENTE (maior que a atual)
  const availableGraduations = selected
    ? GRADUATIONS.filter((g) => GRADUATIONS.indexOf(g) > GRADUATIONS.indexOf(selected.graduation))
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!athleteId || !toGraduation) {
      setError("Selecione o atleta e a nova graduação")
      setIsLoading(false)
      return
    }

    try {
      await api.createGraduationRequest({
        athlete_id: Number(athleteId),
        to_graduation: toGraduation,
        reason: reason || undefined,
      })
      router.push("/dashboard/graduacoes")
      router.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar solicitação")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Nova solicitação de graduação</CardTitle>
          <CardDescription>
            A solicitação será enviada para aprovação de um administrador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="athlete_id">
              Atleta <span className="text-destructive">*</span>
            </Label>
            <Select value={athleteId} onValueChange={setAthleteId} disabled={isLoading}>
              <SelectTrigger id="athlete_id">
                <SelectValue placeholder="Selecione o atleta" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name} — {a.graduation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <p className="text-sm text-muted-foreground">
                Graduação atual: <strong>{selected.graduation}</strong>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="to_graduation">
              Nova graduação <span className="text-destructive">*</span>
            </Label>
            <Select
              value={toGraduation}
              onValueChange={setToGraduation}
              disabled={isLoading || !selected}
            >
              <SelectTrigger id="to_graduation">
                <SelectValue placeholder={selected ? "Selecione" : "Selecione o atleta primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {availableGraduations.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Justificativa</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Concluiu o ciclo de treinamento, passou no exame interno..."
              rows={4}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Send className="mr-2 h-4 w-4" />
            {isLoading ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
