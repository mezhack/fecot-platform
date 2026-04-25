"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Save, KeyRound, Camera, Trash2, Loader2 } from "lucide-react"

import {
  api,
  ApiError,
  type AthleteSex,
  ROLE_LABEL,
  resolveAvatarUrl,
  userStorage,
} from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

const ACCEPTED_MIME = "image/jpeg,image/png,image/webp"
const MAX_MB = 5

export function ProfileForm() {
  const { user, loading: authLoading } = useAuth()

  const [currentUser, setCurrentUser] = useState(user)
  useEffect(() => setCurrentUser(user), [user])

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    birth_date: "",
    weight_kg: "",
    sex: "" as AthleteSex | "",
  })

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const [pwError, setPwError] = useState("")
  const [pwSuccess, setPwSuccess] = useState("")
  const [pwLoading, setPwLoading] = useState(false)
  const [pwData, setPwData] = useState({ current: "", new_: "", confirm: "" })

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarError, setAvatarError] = useState("")
  const [avatarLoading, setAvatarLoading] = useState(false)

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name,
        email: currentUser.email ?? "",
        phone: currentUser.phone ?? "",
        birth_date: currentUser.birth_date ?? "",
        weight_kg: currentUser.weight_kg?.toString() ?? "",
        sex: (currentUser.sex ?? "") as AthleteSex | "",
      })
    }
  }, [currentUser])

  if (authLoading || !currentUser) {
    return <p className="text-muted-foreground">Carregando perfil...</p>
  }

  const initials = currentUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const update = (field: keyof typeof formData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  // ------------------------ Avatar upload ------------------------

  const handleAvatarPick = () => fileInputRef.current?.click()

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validações client-side (o servidor revalida igual)
    if (file.size > MAX_MB * 1024 * 1024) {
      setAvatarError(`Arquivo muito grande. Limite: ${MAX_MB} MB.`)
      e.target.value = ""
      return
    }
    if (!ACCEPTED_MIME.split(",").includes(file.type)) {
      setAvatarError("Use uma imagem JPEG, PNG ou WebP.")
      e.target.value = ""
      return
    }

    setAvatarError("")
    setAvatarLoading(true)
    try {
      const updated = await api.uploadMyAvatar(file)
      setCurrentUser(updated)
      userStorage.set(updated)
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : "Erro ao enviar foto")
    } finally {
      setAvatarLoading(false)
      e.target.value = ""
    }
  }

  const handleAvatarDelete = async () => {
    if (!confirm("Remover sua foto de perfil?")) return
    setAvatarError("")
    setAvatarLoading(true)
    try {
      const updated = await api.deleteMyAvatar()
      setCurrentUser(updated)
      userStorage.set(updated)
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : "Erro ao remover foto")
    } finally {
      setAvatarLoading(false)
    }
  }

  // ------------------------ Submit ------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const payload = {
        name: formData.name || undefined,
        email: formData.email || null,
        phone: formData.phone || null,
        birth_date: formData.birth_date || null,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
        sex: formData.sex || null,
      }
      const updated = await api.updateMe(payload)
      setCurrentUser(updated)
      userStorage.set(updated)
      setSuccess("Perfil atualizado com sucesso.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar perfil")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError("")
    setPwSuccess("")

    if (pwData.new_ !== pwData.confirm) {
      setPwError("A nova senha e a confirmação não conferem")
      return
    }
    if (pwData.new_.length < 6) {
      setPwError("A nova senha deve ter ao menos 6 caracteres")
      return
    }

    setPwLoading(true)
    try {
      await api.updatePassword(pwData.current, pwData.new_)
      setPwSuccess("Senha alterada com sucesso.")
      setPwData({ current: "", new_: "", confirm: "" })
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Erro ao alterar senha")
    } finally {
      setPwLoading(false)
    }
  }

  const avatarDisplayUrl = resolveAvatarUrl(currentUser.avatar_url)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Cabeçalho com avatar e dados federativos (read-only) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {/* Avatar com botão de trocar foto */}
            <div className="relative">
              <Avatar className="h-24 w-24">
                {avatarDisplayUrl && (
                  <AvatarImage src={avatarDisplayUrl} alt={currentUser.name} />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handleAvatarPick}
                disabled={avatarLoading}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent disabled:opacity-50"
                aria-label="Trocar foto"
              >
                {avatarLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_MIME}
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-semibold">{currentUser.name}</h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{ROLE_LABEL[currentUser.role]}</Badge>
                <Badge variant={currentUser.is_dan_rank ? "default" : "secondary"}>
                  {currentUser.graduation}
                </Badge>
                {currentUser.home_academy_name && (
                  <Badge variant="secondary">{currentUser.home_academy_name}</Badge>
                )}
              </div>
              {currentUser.professor_name && (
                <p className="text-sm text-muted-foreground">
                  Professor: {currentUser.professor_name}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Graduação, papel, academia e professor são definidos pela federação.
                Mudanças na graduação passam pelo fluxo de solicitação.
              </p>

              {/* Controles de avatar */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAvatarPick}
                  disabled={avatarLoading}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {currentUser.avatar_url ? "Trocar foto" : "Adicionar foto"}
                </Button>
                {currentUser.avatar_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAvatarDelete}
                    disabled={avatarLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remover
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG ou WebP até {MAX_MB} MB.
              </p>

              {avatarError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{avatarError}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de dados pessoais */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Meus dados</CardTitle>
            <CardDescription>
              Atualize seus dados pessoais. O CPF é imutável após o cadastro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => update("name", e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf_readonly">CPF</Label>
                <Input
                  id="cpf_readonly"
                  value={currentUser.cpf ?? "—"}
                  disabled
                  className="bg-muted"
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
                  value={formData.weight_kg}
                  onChange={(e) => update("weight_kg", e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sex">Sexo</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(v) => update("sex", v)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="sex">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Salvando..." : "Salvar alterações"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Bloco de senha */}
      <form onSubmit={handlePasswordChange}>
        <Card>
          <CardHeader>
            <CardTitle>Alterar senha</CardTitle>
            <CardDescription>
              Defina uma nova senha com ao menos 6 caracteres.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pwError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{pwError}</AlertDescription>
              </Alert>
            )}
            {pwSuccess && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{pwSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pw_current">Senha atual</Label>
                <Input
                  id="pw_current"
                  type="password"
                  autoComplete="current-password"
                  value={pwData.current}
                  onChange={(e) => setPwData((p) => ({ ...p, current: e.target.value }))}
                  disabled={pwLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw_new">Nova senha</Label>
                <Input
                  id="pw_new"
                  type="password"
                  autoComplete="new-password"
                  value={pwData.new_}
                  onChange={(e) => setPwData((p) => ({ ...p, new_: e.target.value }))}
                  disabled={pwLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw_confirm">Confirmar</Label>
                <Input
                  id="pw_confirm"
                  type="password"
                  autoComplete="new-password"
                  value={pwData.confirm}
                  onChange={(e) => setPwData((p) => ({ ...p, confirm: e.target.value }))}
                  disabled={pwLoading}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={pwLoading} variant="outline">
              <KeyRound className="mr-2 h-4 w-4" />
              {pwLoading ? "Alterando..." : "Alterar senha"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
