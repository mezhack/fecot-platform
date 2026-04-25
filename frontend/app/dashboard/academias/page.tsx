import { DashboardLayout } from "@/components/dashboard-layout"
import { AcademiesTable } from "@/components/academies-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2, Search } from "lucide-react"
import Link from "next/link"

export default function AcademiesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Academias</h1>
            <p className="text-muted-foreground">Gerencie as academias filiadas à FECOT</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/academias/novo">
              <Building2 className="mr-2 h-4 w-4" />
              Cadastrar Academia
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CNPJ ou responsável..." className="pl-9" />
          </div>
        </div>

        <AcademiesTable />
      </div>
    </DashboardLayout>
  )
}
