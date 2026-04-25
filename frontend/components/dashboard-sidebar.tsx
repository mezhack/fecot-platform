"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Building2, Award, Calendar, Settings, X } from "lucide-react"

interface DashboardSidebarProps {
  open: boolean
  onClose: () => void
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Atletas", href: "/dashboard/atletas", icon: Users },
  { name: "Academias", href: "/dashboard/academias", icon: Building2 },
  { name: "Graduações", href: "/dashboard/graduacoes", icon: Award },
  { name: "Eventos", href: "/dashboard/eventos", icon: Calendar },
  { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
]

export function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-card transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fecot2-fAjBQziUtfrAhPlp3RsyRALAz5TmqI.jpeg"
                alt="FECOT Logo"
                width={100}
                height={33}
                className="h-8 w-auto"
              />
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  onClick={onClose}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">FECOT</p>
              <p className="text-xs text-muted-foreground">Federação Centro-Oeste de Taekwondo</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
