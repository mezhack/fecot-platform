import { DashboardLayout } from "@/components/dashboard-layout"
import { AcademyForm } from "@/components/academy-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewAcademyPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard/academias">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Cadastrar Academia</h1>
            <p className="text-muted-foreground">Preencha os dados da nova academia</p>
          </div>
        </div>

        <AcademyForm />
      </div>
    </DashboardLayout>
  )
}
