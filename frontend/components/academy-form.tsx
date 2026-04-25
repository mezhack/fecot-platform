"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Save } from "lucide-react"

import { api, ApiError, type Academy, type Athlete } from "@/lib/api"

interface AcademyFormProps {
  academy?: Academy
}

export function AcademyForm({ academy }: AcademyFormProps) {
  const router = useRouter()
  const isEdit = !!academy

  const [formData, setFormData] = useState({
    name: academy?.name ?? "",
    cnpj: academy?.cnpj ?? "",
    address: academy?.address ?? "",
    city: academy?.city ?? "",
    state: academy?.state ?? "",
    zip_code: academy?.zip_code ?? "",
    latitude: academy?.latitude?.toString() ?? "",
    longitude: academy?.longitude?.toString() ?? "",
    phone: academy?.phone ?? "",
    email: academy?.email ?? "",
    manager_id: academy?.manager_id ? String(academy.manager_id) : "",
  })

  const [managers, setManagers] = useState<Athlete[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const all = await api.listAthletes()
        // Manager precisa ser academy_manager ou admin E ter graduação ≥ Dan
        setManagers(
          all.filter(
            (a) =>
              a.can_be_professor &&
              (a.role === "academy_manager" || a.role === "admin"),
          ),
        )
      } catch {
        /* silencioso */
      }
    })()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!formData.name || !formData.manager_id) {
      setError("Nome e gestor são obrigatórios")
      setIsLoading(false)
      return
    }

    const payload: Record<string, unknown> = {
      name: formData.name,
      cnpj: formData.cnpj || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      zip_code: formData.zip_code || null,
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
      phone: formData.phone || null,
      email: formData.email || null,
      manager_id: Number(formData.manager_id),
    }

    try {
      if (isEdit && academy) {
        await api.updateAcademy(academy.id, payload)
      } else {
        await api.createAcademy(payload as Parameters<typeof api.createAcademy>[0])
      }
      router.push("/dashboard/academias")
      router.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar academia")
    } finally {
      setIsLoading(false)
    }
  }

  const update = (field: keyof typeof formData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Dados da Academia</CardTitle>
          <CardDescription>
            Campos marcados com <span className="text-destructive">*</span> são obrigatórios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => update("name", e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={formData.cnpj}
                onChange={(e) => update("cnpj", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager_id">
                Gestor responsável <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.manager_id}
                onValueChange={(v) => update("manager_id", v)}
                disabled={isLoading}
              >
                <SelectTrigger id="manager_id">
                  <SelectValue placeholder="Selecione um gestor" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} — {m.graduation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Só atletas com papel "Gestor" ou "Admin" e graduação ≥ 1º Dan aparecem aqui.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => update("address", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => update("city", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">UF</Label>
              <Input
                id="state"
                maxLength={2}
                placeholder="DF"
                value={formData.state}
                onChange={(e) => update("state", e.target.value.toUpperCase())}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code">CEP</Label>
              <Input
                id="zip_code"
                placeholder="70000-000"
                value={formData.zip_code}
                onChange={(e) => update("zip_code", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => update("phone", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => update("email", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude (GPS)</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => update("latitude", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude (GPS)</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => update("longitude", e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Latitude e longitude são usadas no mapa interativo público de academias.
          </p>
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar academia"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
