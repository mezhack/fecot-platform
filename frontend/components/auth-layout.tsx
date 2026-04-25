"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, LogOut } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { ROLE_LABEL, resolveAvatarUrl } from "@/lib/api"

/**
 * Layout minimalista pra área autenticada quando NÃO estamos no dashboard.
 *
 * Usado pela tela /perfil, que todos os roles acessam. Atletas comuns só
 * veem isso; outros roles têm o link "Voltar ao dashboard".
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  const canAccessDashboard = user.role !== "athlete"

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href={canAccessDashboard ? "/dashboard" : "/perfil"} className="font-semibold">
            FECOT Platform
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 text-sm">
              <Avatar className="h-8 w-8">
                {resolveAvatarUrl(user.avatar_url) && (
                  <AvatarImage src={resolveAvatarUrl(user.avatar_url)!} alt={user.name} />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium leading-tight">{user.name}</span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
            </div>
            {canAccessDashboard && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6 lg:p-8">{children}</main>
    </div>
  )
}
