import { Button } from "@/components/ui/button"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-accent text-accent-foreground">
      <div className="absolute inset-0 bg-[url('/taekwondo-action-silhouette.jpg')] bg-cover bg-center opacity-20" />

      <div className="container relative py-24 md:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-6xl lg:text-7xl tracking-tight text-balance mb-6">
            Federação Centro-Oeste de Taekwondo
          </h1>
          <p className="text-lg md:text-xl text-accent-foreground/90 mb-8 leading-relaxed">
            Promovendo excelência, disciplina e espírito esportivo através do Taekwondo na região Centro-Oeste do Brasil
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link href="#academias">Encontrar Academia</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-accent-foreground/10 border-accent-foreground/20 hover:bg-accent-foreground/20"
            >
              <Link href="/login">Área do Atleta</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
