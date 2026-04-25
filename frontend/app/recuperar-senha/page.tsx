import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { RecoverPasswordForm } from "@/components/recover-password-form"
import Image from "next/image"

export default function RecoverPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="container grid min-h-[calc(100vh-4rem)] lg:grid-cols-2 gap-8 py-8 lg:py-0">
          {/* Left side - Branding */}
          <div className="hidden lg:flex flex-col justify-center items-center bg-accent text-accent-foreground p-12 rounded-lg">
            <div className="max-w-md space-y-6 text-center">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fecot2-fAjBQziUtfrAhPlp3RsyRALAz5TmqI.jpeg"
                alt="FECOT Logo"
                width={300}
                height={100}
                className="mx-auto"
              />
              <h1 className="font-display text-4xl font-bold tracking-tight">Recuperação de Senha</h1>
              <p className="text-lg text-accent-foreground/80">Enviaremos instruções para redefinir sua senha</p>
              <div className="pt-6 space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <p className="text-sm text-accent-foreground/70">Digite seu email cadastrado</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <p className="text-sm text-accent-foreground/70">Receba um link de recuperação por email</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <p className="text-sm text-accent-foreground/70">Crie uma nova senha segura</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Recovery Form */}
          <div className="flex items-center justify-center p-4 lg:p-8">
            <div className="w-full max-w-md space-y-6">
              <div className="space-y-2 text-center lg:text-left">
                <h2 className="font-display text-3xl font-bold tracking-tight">Recuperar Senha</h2>
                <p className="text-muted-foreground">Digite seu email para receber instruções</p>
              </div>

              <RecoverPasswordForm />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
