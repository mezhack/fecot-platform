"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, ArrowLeft, KeyRound } from "lucide-react"
import Link from "next/link"

/**
 * A plataforma não envia emails: a redefinição de senha é feita por um
 * responsável (professor individual, gestor da academia ou administração
 * da FECOT) via edição administrativa do atleta.
 */
export function RecoverPasswordForm() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-center">Esqueceu sua senha?</CardTitle>
        <CardDescription className="text-center">
          A redefinição é feita pela sua academia ou pela federação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p>
              Procure seu <strong>professor</strong>, o <strong>gestor da sua academia</strong> ou a{" "}
              <strong>administração da FECOT</strong> e solicite a redefinição da sua senha.
            </p>
          </AlertDescription>
        </Alert>
        <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
          <li>Entre em contato com o responsável pela sua academia</li>
          <li>Ele define uma senha temporária para você</li>
          <li>
            Faça login e troque a senha em <strong>Meu Perfil</strong>
          </li>
        </ol>
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
