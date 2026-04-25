"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Camera, Trash2, Loader2 } from "lucide-react"

import { ApiError, type Athlete, resolveAvatarUrl } from "@/lib/api"

const ACCEPTED_MIME = "image/jpeg,image/png,image/webp"
const MAX_MB = 5

interface AvatarUploaderProps {
  athlete: Athlete
  onUpload: (file: File) => Promise<Athlete>
  onDelete: () => Promise<Athlete>
  onChange?: (athlete: Athlete) => void
  /** Tamanho do avatar: "sm" (default) = h-20 w-20, "lg" = h-24 w-24 */
  size?: "sm" | "lg"
}

/**
 * Componente reutilizável de upload de avatar.
 *
 * Usado em:
 * - ProfileForm (o próprio usuário — chama api.uploadMyAvatar)
 * - AthleteForm em modo edição (teacher+ editando outro — chama api.uploadAthleteAvatar)
 */
export function AvatarUploader({
  athlete,
  onUpload,
  onDelete,
  onChange,
  size = "sm",
}: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const initials = athlete.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const avatarUrl = resolveAvatarUrl(athlete.avatar_url)
  const sizeClass = size === "lg" ? "h-24 w-24" : "h-20 w-20"

  const handlePick = () => fileInputRef.current?.click()

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Arquivo muito grande. Limite: ${MAX_MB} MB.`)
      e.target.value = ""
      return
    }
    if (!ACCEPTED_MIME.split(",").includes(file.type)) {
      setError("Use JPEG, PNG ou WebP.")
      e.target.value = ""
      return
    }

    setError("")
    setLoading(true)
    try {
      const updated = await onUpload(file)
      onChange?.(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar foto")
    } finally {
      setLoading(false)
      e.target.value = ""
    }
  }

  const handleDelete = async () => {
    if (!confirm("Remover a foto de perfil?")) return
    setError("")
    setLoading(true)
    try {
      const updated = await onDelete()
      onChange?.(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover foto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-start gap-4">
      <div className="relative">
        <Avatar className={sizeClass}>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={athlete.name} />}
          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
            {initials}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={handlePick}
          disabled={loading}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent disabled:opacity-50"
          aria-label="Trocar foto"
        >
          {loading ? (
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
          onChange={handleChange}
        />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePick}
            disabled={loading}
          >
            <Camera className="mr-2 h-4 w-4" />
            {athlete.avatar_url ? "Trocar foto" : "Adicionar foto"}
          </Button>
          {athlete.avatar_url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={loading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG ou WebP até {MAX_MB} MB. Servidor converte pra WebP 512×512.
        </p>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
