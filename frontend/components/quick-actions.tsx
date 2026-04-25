import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, Building2, Calendar, FileText } from "lucide-react"
import Link from "next/link"

export function QuickActions() {
  const actions = [
    {
      title: "Cadastrar Atleta",
      description: "Adicionar novo atleta à plataforma",
      icon: UserPlus,
      href: "/dashboard/atletas/novo",
    },
    {
      title: "Cadastrar Academia",
      description: "Registrar nova academia filiada",
      icon: Building2,
      href: "/dashboard/academias/novo",
    },
    {
      title: "Criar Evento",
      description: "Agendar competição ou treinamento",
      icon: Calendar,
      href: "/dashboard/eventos/novo",
    },
    {
      title: "Gerar Relatório",
      description: "Exportar dados e estatísticas",
      icon: FileText,
      href: "/dashboard/relatorios",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
        <CardDescription>Acesso rápido às funcionalidades principais</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {actions.map((action) => (
          <Button key={action.title} asChild variant="outline" className="h-auto justify-start p-4 bg-transparent">
            <Link href={action.href}>
              <action.icon className="mr-3 h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">{action.title}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
