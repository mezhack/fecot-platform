"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Check, X } from "lucide-react"

import {
  api,
  ApiError,
  type GraduationRequest,
  type GraduationRequestStatus,
  STATUS_LABEL,
} from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

export function GraduationRequestsTable() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<GraduationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<GraduationRequestStatus | "all">("pending")

  const [reviewDialog, setReviewDialog] = useState<{
    req: GraduationRequest
    action: "approve" | "reject"
  } | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = statusFilter === "all" ? undefined : { status: statusFilter }
      setRequests(await api.listGraduationRequests(params))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar solicitações")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const openReview = (req: GraduationRequest, action: "approve" | "reject") => {
    setReviewDialog({ req, action })
    setReviewNotes("")
  }

  const confirmReview = async () => {
    if (!reviewDialog) return
    setSubmitting(true)
    try {
      if (reviewDialog.action === "approve") {
        await api.approveGraduationRequest(reviewDialog.req.id, reviewNotes || undefined)
      } else {
        await api.rejectGraduationRequest(reviewDialog.req.id, reviewNotes || undefined)
      }
      setReviewDialog(null)
      await load()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao revisar solicitação")
    } finally {
      setSubmitting(false)
    }
  }

  const isAdmin = user?.role === "admin"

  return (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <TabsList>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="approved">Aprovadas</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

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
              <TableHead>Atleta</TableHead>
              <TableHead>Graduação atual</TableHead>
              <TableHead>Nova graduação</TableHead>
              <TableHead>Solicitado por</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Revisado por</TableHead>
              <TableHead className="w-[180px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma solicitação encontrada
                </TableCell>
              </TableRow>
            ) : (
              requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.athlete_name ?? `ID ${r.athlete_id}`}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.from_graduation}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{r.to_graduation}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.requested_by_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "approved"
                          ? "default"
                          : r.status === "rejected"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.reviewed_by_name ?? "—"}</TableCell>
                  <TableCell>
                    {r.status === "pending" && isAdmin ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReview(r, "approve")}
                          className="text-green-700 hover:text-green-800"
                        >
                          <Check className="mr-1 h-4 w-4" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReview(r, "reject")}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="mr-1 h-4 w-4" /> Rejeitar
                        </Button>
                      </div>
                    ) : r.status === "pending" ? (
                      <span className="text-xs text-muted-foreground">
                        Aguardando admin
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString("pt-BR") : ""}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!reviewDialog} onOpenChange={(open) => !open && setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.action === "approve" ? "Aprovar solicitação" : "Rejeitar solicitação"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog
                ? `${reviewDialog.req.athlete_name}: ${reviewDialog.req.from_graduation} → ${reviewDialog.req.to_graduation}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="review_notes">Observações (opcional)</Label>
            <Textarea
              id="review_notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Motivo ou detalhes adicionais..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={confirmReview}
              disabled={submitting}
              variant={reviewDialog?.action === "reject" ? "destructive" : "default"}
            >
              {submitting
                ? "Enviando..."
                : reviewDialog?.action === "approve"
                  ? "Confirmar aprovação"
                  : "Confirmar rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
