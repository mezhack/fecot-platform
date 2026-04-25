"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, MoreHorizontal, Edit, Trash2, Search } from "lucide-react"
import Link from "next/link"

import { api, ApiError, type Academy } from "@/lib/api"

export function AcademiesTable() {
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const load = async (q?: string) => {
    setLoading(true)
    setError(null)
    try {
      setAcademies(await api.listAcademies(q ? { search: q } : undefined))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar academias")
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
    if (!confirm(`Remover academia "${name}"?`)) return
    try {
      await api.deleteAcademy(id)
      setAcademies((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao remover")
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou cidade..."
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
              <TableHead>CNPJ</TableHead>
              <TableHead>Gestor</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Alunos</TableHead>
              <TableHead>Professores</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : academies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma academia encontrada
                </TableCell>
              </TableRow>
            ) : (
              academies.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-muted-foreground">{a.cnpj ?? "—"}</TableCell>
                  <TableCell>{a.manager_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.manager_contact ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.city && a.state ? `${a.city}/${a.state}` : a.city || a.state || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{a.students_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{a.teachers_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.active ? "default" : "secondary"}>
                      {a.active ? "Ativa" : "Inativa"}
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
                          <Link href={`/dashboard/academias/${a.id}/editar`}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
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
