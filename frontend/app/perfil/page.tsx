import { AuthLayout } from "@/components/auth-layout"
import { ProfileForm } from "@/components/profile-form"

export default function PerfilPage() {
  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Mantenha seus dados pessoais atualizados.
          </p>
        </div>
        <ProfileForm />
      </div>
    </AuthLayout>
  )
}
