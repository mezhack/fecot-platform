import { DashboardLayout } from "@/components/dashboard-layout"
import { GraduationRequestForm } from "@/components/graduation-request-form"
import { Suspense } from "react"

export default function NovaGraduacaoPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Solicitação</h1>
          <p className="text-muted-foreground">
            Solicite uma mudança de graduação para um atleta.
          </p>
        </div>
        <Suspense fallback={<p>Carregando...</p>}>
          <GraduationRequestForm />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}
