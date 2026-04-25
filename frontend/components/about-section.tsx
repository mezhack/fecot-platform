import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Users, Target, Award } from "lucide-react"

const features = [
  {
    icon: Trophy,
    title: "Competições",
    description: "Organizamos campeonatos regionais e nacionais de alto nível",
  },
  {
    icon: Users,
    title: "Comunidade",
    description: "Mais de 50 academias afiliadas em toda região Centro-Oeste",
  },
  {
    icon: Target,
    title: "Formação",
    description: "Programas de capacitação para atletas e instrutores",
  },
  {
    icon: Award,
    title: "Graduação",
    description: "Sistema oficial de graduação e certificação de faixas",
  },
]

export function AboutSection() {
  return (
    <section id="sobre" className="py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl tracking-tight mb-4">
            Sobre a FECOT
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A Federação Centro-Oeste de Taekwondo é a entidade responsável por regulamentar, organizar e promover o
            Taekwondo nos estados de Goiás, Mato Grosso, Mato Grosso do Sul e Distrito Federal.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/50">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
