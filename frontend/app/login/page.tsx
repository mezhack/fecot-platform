import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LoginForm } from "@/components/login-form"
import Image from "next/image"

export default function LoginPage() {
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
              <h1 className="font-display text-4xl font-bold tracking-tight">Bem-vindo à FECOT</h1>
              <p className="text-lg text-accent-foreground/80">Federação Centro-Oeste de Taekwondo</p>
              <div className="pt-6 space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <p className="text-sm text-accent-foreground/70">Gerencie atletas e academias em um só lugar</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <p className="text-sm text-accent-foreground/70">Acompanhe graduações e progressos</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <p className="text-sm text-accent-foreground/70">Acesse informações de eventos e competições</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="flex items-center justify-center p-4 lg:p-8">
            <div className="w-full max-w-md space-y-6">
              <div className="space-y-2 text-center lg:text-left">
                <h2 className="font-display text-3xl font-bold tracking-tight">Entrar na Plataforma</h2>
                <p className="text-muted-foreground">Acesse sua conta com email ou CPF</p>
              </div>

              <LoginForm />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
