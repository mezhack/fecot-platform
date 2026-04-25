import { DashboardLayout } from "@/components/dashboard-layout"
import { AthletesTable } from "@/components/athletes-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Search } from "lucide-react"
import Link from "next/link"

export default function AthletesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Atletas</h1>
            <p className="text-muted-foreground">Gerencie os atletas cadastrados na plataforma</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/atletas/novo">
              <UserPlus className="mr-2 h-4 w-4" />
              Cadastrar Atleta
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, email ou CPF..." className="pl-9" />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filtrar por graduação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as graduações</SelectItem>
              <SelectItem value="gub">Gubs (Coloridas)</SelectItem>
              <SelectItem value="dan">Dans (Pretas)</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filtrar por academia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as academias</SelectItem>
              <SelectItem value="1">Academia Tigre Branco</SelectItem>
              <SelectItem value="2">Academia Dragão Vermelho</SelectItem>
              <SelectItem value="3">Academia Leão Dourado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <AthletesTable />
      </div>
    </DashboardLayout>
  )
}
