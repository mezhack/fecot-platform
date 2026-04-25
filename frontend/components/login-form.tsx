"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import Link from "next/link"

import { useAuth } from "@/hooks/use-auth"
import { ApiError } from "@/lib/api"

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!identifier || !password) {
      setError("Por favor, preencha todos os campos")
      setIsLoading(false)
      return
    }

    const isEmail = identifier.includes("@")
    const isCPF = /^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(identifier)

    if (!isEmail && !isCPF) {
      setError("Digite um email válido ou CPF (apenas números ou com pontuação)")
      setIsLoading(false)
      return
    }

    try {
      const athlete = await login(identifier, password)
      // Atleta comum vai direto pro perfil; outros roles vão pro dashboard.
      if (athlete.role === "athlete") {
        router.push("/perfil")
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setError("Email/CPF ou senha incorretos")
        else if (err.status === 403) setError(err.message || "Conta inativa")
        else setError(err.message || "Erro ao fazer login")
      } else {
        setError("Erro ao conectar com o servidor. Verifique sua conexão.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Entre com seu email ou CPF cadastrado</CardDescription>
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
            <Label htmlFor="identifier">Email ou CPF</Label>
            <Input
              id="identifier"
              type="text"
              placeholder="seu@email.com ou 000.000.000-00"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
              required
            />
            <p className="text-xs text-muted-foreground">Digite seu email ou CPF (apenas números)</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link href="/recuperar-senha" className="text-xs text-primary hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Não consegue acessar?{" "}
            <Link href="/recuperar-senha" className="text-primary hover:underline font-medium">
              Recupere sua senha
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
