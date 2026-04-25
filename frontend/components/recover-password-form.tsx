"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export function RecoverPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setIsLoading(true)

    // Validação básica
    if (!email) {
      setError("Por favor, digite seu email")
      setIsLoading(false)
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Digite um email válido")
      setIsLoading(false)
      return
    }

    // Aqui você conectará com o backend Ruby on Rails
    try {
      console.log("[v0] Password recovery request for:", email)

      // TODO: Implementar chamada real para o backend
      // const response = await fetch('/api/auth/recover-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email })
      // })

      // Simulação de delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Simulação de sucesso
      setSuccess(true)
    } catch (err) {
      setError("Erro ao enviar email de recuperação. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center">Email Enviado!</CardTitle>
          <CardDescription className="text-center">Verifique sua caixa de entrada</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Enviamos um link de recuperação para <strong>{email}</strong>. Clique no link para criar uma nova senha.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground text-center">
            Não recebeu o email? Verifique sua pasta de spam ou tente novamente em alguns minutos.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full bg-transparent">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o login
            </Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar Senha</CardTitle>
        <CardDescription>Digite o email cadastrado na plataforma</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">Enviaremos um link de recuperação para este email</p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Enviando..." : "Enviar Link de Recuperação"}
          </Button>

          <Button asChild variant="ghost" className="w-full">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o login
            </Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
