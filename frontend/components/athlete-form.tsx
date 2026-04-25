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
import { AlertCircle, Save, Info } from "lucide-react"
import { GRADUATIONS, canBeProfessor } from "@/lib/graduations"

import { api, ApiError, type Academy, type Athlete, type AthleteRole, type AthleteSex } from "@/lib/api"
import { AvatarUploader } from "@/components/avatar-uploader"

interface AthleteFormProps {
  athlete?: Athlete
}

/**
 * Formulário de criação/edição de atleta.
 *
 * IMPORTANTE: este form NÃO altera a graduação no modo de edição — mudanças
 * de graduação passam pelo fluxo de GraduationRequest (exceto admin, que
 * tem endpoint próprio). O select de graduação fica desabilitado em edição.
 */
export function AthleteForm({ athlete }: AthleteFormProps) {
  const router = useRouter()
  const isEdit = !!athlete

  // Espelha o atleta pra poder atualizar o avatar sem recarregar a página
  const [currentAthlete, setCurrentAthlete] = useState<Athlete | undefined>(athlete)

  const [formData, setFormData] = useState({
    name: athlete?.name ?? "",
    email: athlete?.email ?? "",
    cpf: athlete?.cpf ?? "",
    phone: athlete?.phone ?? "",
    birth_date: athlete?.birth_date ?? "",
    weight_kg: athlete?.weight_kg?.toString() ?? "",
    sex: (athlete?.sex ?? "") as AthleteSex | "",
    graduation: athlete?.graduation ?? "",
    role: (athlete?.role ?? "athlete") as AthleteRole,
    home_academy_id: athlete?.home_academy_id ? String(athlete.home_academy_id) : "",
    professor_id: athlete?.professor_id ? String(athlete.professor_id) : "",
    password: "",
  })

  const [academies, setAcademies] = useState<Academy[]>([])
  const [professors, setProfessors] = useState<Athlete[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [acs, allAthletes] = await Promise.all([
          api.listAcademies({ active: true }),
          api.listAthletes(),
        ])
        setAcademies(acs)
        setProfessors(allAthletes.filter((a) => a.can_be_professor))
      } catch {
        /* silencioso */
      }
    })()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!formData.name || !formData.graduation) {
      setError("Nome e graduação são obrigatórios")
      setIsLoading(false)
      return
    }

    // Validação local: role + graduação
    if (
      (formData.role === "teacher" || formData.role === "academy_manager") &&
      !canBeProfessor(formData.graduation)
    ) {
      setError(
        `Atletas com papel "${formData.role === "teacher" ? "Professor" : "Gestor de Academia"}" precisam ter graduação ≥ 1º Dan`,
      )
      setIsLoading(false)
      return
    }

    const payload: Record<string, unknown> = {
      name: formData.name,
      email: formData.email || null,
      cpf: formData.cpf || null,
      phone: formData.phone || null,
      birth_date: formData.birth_date || null,
      weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
      sex: formData.sex || null,
      role: formData.role,
      home_academy_id: formData.home_academy_id ? Number(formData.home_academy_id) : null,
      professor_id: formData.professor_id ? Number(formData.professor_id) : null,
    }
    // Graduation só no create — no update não entra no payload (força fluxo de GraduationRequest)
    if (!isEdit) {
      payload.graduation = formData.graduation
    }
    if (formData.password) payload.password = formData.password

    try {
      if (isEdit && athlete) {
        await api.updateAthlete(athlete.id, payload)
      } else {
        await api.createAthlete(payload)
      }
      router.push("/dashboard/atletas")
      router.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar atleta")
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
          <CardTitle>Dados do Atleta</CardTitle>
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

          {isEdit && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Para alterar a graduação deste atleta, use o fluxo de{" "}
                <a href="/dashboard/graduacoes/nova" className="text-primary underline">
                  solicitação de graduação
                </a>
                .
              </AlertDescription>
            </Alert>
          )}

          {isEdit && currentAthlete && (
            <div className="border rounded-lg p-4 bg-muted/20">
              <Label className="mb-3 block">Foto de perfil</Label>
              <AvatarUploader
                athlete={currentAthlete}
                onUpload={(file) => api.uploadAthleteAvatar(currentAthlete.id, file)}
                onDelete={() => api.deleteAthleteAvatar(currentAthlete.id)}
                onChange={setCurrentAthlete}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
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
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => update("cpf", e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Se não definir senha, o CPF será usado como senha inicial
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(61) 99999-9999"
                value={formData.phone}
                onChange={(e) => update("phone", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de nascimento</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => update("birth_date", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight_kg">Peso (kg)</Label>
              <Input
                id="weight_kg"
                type="number"
                step="0.1"
                min="0"
                max="500"
                placeholder="72.5"
                value={formData.weight_kg}
                onChange={(e) => update("weight_kg", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex">Sexo</Label>
              <Select value={formData.sex} onValueChange={(v) => update("sex", v)} disabled={isLoading}>
                <SelectTrigger id="sex">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="graduation">
                Graduação <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.graduation}
                onValueChange={(v) => update("graduation", v)}
                disabled={isLoading || isEdit}
              >
                <SelectTrigger id="graduation">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {GRADUATIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Papel</Label>
              <Select value={formData.role} onValueChange={(v) => update("role", v)} disabled={isLoading}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="athlete">Atleta</SelectItem>
                  <SelectItem value="teacher">Professor</SelectItem>
                  <SelectItem value="academy_manager">Gestor de Academia</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Professor e Gestor precisam de graduação ≥ 1º Dan
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="home_academy_id">Academia</Label>
              <Select
                value={formData.home_academy_id}
                onValueChange={(v) => update("home_academy_id", v)}
                disabled={isLoading}
              >
                <SelectTrigger id="home_academy_id">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  {academies.map((ac) => (
                    <SelectItem key={ac.id} value={String(ac.id)}>
                      {ac.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="professor_id">Professor responsável</Label>
              <Select
                value={formData.professor_id}
                onValueChange={(v) => update("professor_id", v)}
                disabled={isLoading}
              >
                <SelectTrigger id="professor_id">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {professors.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} — {p.graduation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="password">
                {isEdit ? "Nova senha (opcional)" : "Senha (opcional, padrão = CPF)"}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => update("password", e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar atleta"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
