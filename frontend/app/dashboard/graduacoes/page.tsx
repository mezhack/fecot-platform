import { DashboardLayout } from "@/components/dashboard-layout"
import { GraduationRequestsTable } from "@/components/graduation-requests-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default function GraduacoesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Solicitações de Graduação</h1>
            <p className="text-muted-foreground">
              Fluxo de aprovação de mudanças de graduação dos atletas.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/graduacoes/nova">
              <Plus className="mr-2 h-4 w-4" /> Nova solicitação
            </Link>
          </Button>
        </div>

        <GraduationRequestsTable />
      </div>
    </DashboardLayout>
  )
}
