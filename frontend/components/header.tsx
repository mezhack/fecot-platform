"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { useState } from "react"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fecot2-fAjBQziUtfrAhPlp3RsyRALAz5TmqI.jpeg"
            alt="FECOT Logo"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="#sobre" className="text-sm font-medium hover:text-primary transition-colors">
            Sobre
          </Link>
          <Link href="#academias" className="text-sm font-medium hover:text-primary transition-colors">
            Academias
          </Link>
          <Link href="#eventos" className="text-sm font-medium hover:text-primary transition-colors">
            Eventos
          </Link>
          <Link href="#contato" className="text-sm font-medium hover:text-primary transition-colors">
            Contato
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild className="hidden md:inline-flex">
            <Link href="/login">Entrar</Link>
          </Button>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container flex flex-col gap-4 py-4">
            <Link href="#sobre" className="text-sm font-medium hover:text-primary transition-colors">
              Sobre
            </Link>
            <Link href="#academias" className="text-sm font-medium hover:text-primary transition-colors">
              Academias
            </Link>
            <Link href="#eventos" className="text-sm font-medium hover:text-primary transition-colors">
              Eventos
            </Link>
            <Link href="#contato" className="text-sm font-medium hover:text-primary transition-colors">
              Contato
            </Link>
            <div className="pt-2 border-t border-border">
              <Button asChild className="w-full">
                <Link href="/login">Entrar</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
