"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, MoreHorizontal, Edit, Trash2, Search, Award } from "lucide-react"
import Link from "next/link"

import { api, ApiError, type Athlete, ROLE_LABEL, resolveAvatarUrl } from "@/lib/api"

function formatCpf(cpf: string | null): string {
  if (!cpf) return "—"
  const digits = cpf.replace(/\D/g, "")
  if (digits.length !== 11) return cpf
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function AthletesTable() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const load = async (q?: string) => {
    setLoading(true)
    setError(null)
    try {
      setAthletes(await api.listAthletes(q ? { search: q } : undefined))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar atletas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remover atleta "${name}"?`)) return
    try {
      await api.deleteAthlete(id)
      setAthletes((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao remover atleta")
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou CPF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Sexo</TableHead>
              <TableHead>Graduação</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Academia</TableHead>
              <TableHead>Professor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : athletes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhum atleta encontrado
                </TableCell>
              </TableRow>
            ) : (
              athletes.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {resolveAvatarUrl(a.avatar_url) && (
                          <AvatarImage src={resolveAvatarUrl(a.avatar_url)!} alt={a.name} />
                        )}
                        <AvatarFallback className="text-xs">
                          {a.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{a.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatCpf(a.cpf)}</TableCell>
                  <TableCell className="text-muted-foreground">{a.age ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.sex === "male" ? "M" : a.sex === "female" ? "F" : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.is_dan_rank ? "default" : "secondary"}>{a.graduation}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROLE_LABEL[a.role]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.home_academy_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.professor_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={a.active ? "default" : "secondary"}>
                      {a.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/atletas/${a.id}/editar`}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/graduacoes/nova?athlete_id=${a.id}`}>
                            <Award className="mr-2 h-4 w-4" /> Solicitar nova graduação
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(a.id, a.name)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
