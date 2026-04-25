import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function RecentActivity() {
  // TODO: Buscar atividades reais do backend
  const activities = [
    {
      id: 1,
      user: "João Silva",
      action: "cadastrou novo atleta",
      target: "Maria Santos",
      time: "Há 2 horas",
      type: "create",
    },
    {
      id: 2,
      user: "Pedro Costa",
      action: "atualizou graduação",
      target: "Carlos Oliveira - 2º Dan",
      time: "Há 4 horas",
      type: "update",
    },
    {
      id: 3,
      user: "Ana Paula",
      action: "cadastrou academia",
      target: "Academia Tigre Branco",
      time: "Há 6 horas",
      type: "create",
    },
    {
      id: 4,
      user: "Roberto Lima",
      action: "agendou evento",
      target: "Campeonato Regional 2025",
      time: "Há 1 dia",
      type: "event",
    },
  ]

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "create":
        return <Badge variant="default">Novo</Badge>
      case "update":
        return <Badge variant="secondary">Atualização</Badge>
      case "event":
        return <Badge variant="outline">Evento</Badge>
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividades Recentes</CardTitle>
        <CardDescription>Últimas ações realizadas na plataforma</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {activity.user
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm">
                  <span className="font-medium">{activity.user}</span> {activity.action}{" "}
                  <span className="font-medium">{activity.target}</span>
                </p>
                {getTypeBadge(activity.type)}
              </div>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
