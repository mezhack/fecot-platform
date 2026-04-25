import { DashboardLayout } from "@/components/dashboard-layout"
import { AthleteForm } from "@/components/athlete-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewAthletePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard/atletas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Cadastrar Atleta</h1>
            <p className="text-muted-foreground">Preencha os dados do novo atleta</p>
          </div>
        </div>

        <AthleteForm />
      </div>
    </DashboardLayout>
  )
}
