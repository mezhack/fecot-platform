"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, Award, TrendingUp } from "lucide-react"

import { api } from "@/lib/api"

interface Stats {
  totalAthletes: number
  totalAcademies: number
  totalDan: number
  activeAthletes: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [athletes, academies] = await Promise.all([
          api.listAthletes(),
          api.listAcademies(),
        ])
        setStats({
          totalAthletes: athletes.length,
          totalAcademies: academies.length,
          totalDan: athletes.filter((a) => a.is_dan_rank).length,
          activeAthletes: athletes.filter((a) => a.active).length,
        })
      } catch {
        setStats({ totalAthletes: 0, totalAcademies: 0, totalDan: 0, activeAthletes: 0 })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const cards = [
    {
      title: "Total de Atletas",
      value: loading ? "…" : String(stats?.totalAthletes ?? 0),
      description: loading ? "Carregando" : `${stats?.activeAthletes ?? 0} ativos`,
      icon: Users,
    },
    {
      title: "Academias Filiadas",
      value: loading ? "…" : String(stats?.totalAcademies ?? 0),
      description: "Federadas",
      icon: Building2,
    },
    {
      title: "Graduações Dan",
      value: loading ? "…" : String(stats?.totalDan ?? 0),
      description: "Faixas pretas",
      icon: Award,
    },
    {
      title: "Taxa de Atividade",
      value:
        loading || !stats || stats.totalAthletes === 0
          ? "—"
          : `${Math.round((stats.activeAthletes / stats.totalAthletes) * 100)}%`,
      description: "Atletas ativos / total",
      icon: TrendingUp,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
