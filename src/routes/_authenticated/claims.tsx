import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/claims")({
  component: ClaimsPage,
  head: () => ({
    meta: [
      { title: "Sinistros - Coutseg" },
      { name: "description", content: "Registre e acompanhe os sinistros da Coutseg" },
    ],
  }),
});

function ClaimsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Database["public"]["Tables"]["claims"]["Row"] | null>(null);
  const queryClient = useQueryClient();

  const { data: claims, isLoading } = useQuery({
    queryKey: ["claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("*, policies(policy_number, clients(full_name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: Database["public"]["Tables"]["claims"]["Insert"]) => {
      if (editing) {
        const { error } = await supabase.from("claims").update(values).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("claims").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success(editing ? "Sinistro atualizado" : "Sinistro registrado");
    },
    onError: (err) => {
      toast.error("Erro ao salvar", { description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("claims").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      toast.success("Sinistro removido");
    },
  });

  const filtered = claims?.filter((c) =>
    [c.claim_number, (c as any).policies?.policy_number, c.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sinistros</h1>
          <p className="text-muted-foreground">Registre e acompanhe ocorrências</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Registrar sinistro
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Buscar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, apólice ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Apólice</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ocorrência</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.length ? (
                  filtered.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                          {claim.claim_number}
                        </div>
                      </TableCell>
                      <TableCell>{(claim as any).policies?.policy_number ?? "—"}</TableCell>
                      <TableCell>{(claim as any).policies?.clients?.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={claimStatusVariant(claim.status)}>{claim.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {claim.occurrence_date
                          ? format(new Date(claim.occurrence_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell>{formatCurrency(claim.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(claim);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(claim.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhum sinistro encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClaimDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSubmit={(values) => saveMutation.mutate(values)}
        isPending={saveMutation.isPending}
      />
    </div>
  );
}

function ClaimDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Database["public"]["Tables"]["claims"]["Row"] | null;
  onSubmit: (values: Database["public"]["Tables"]["claims"]["Insert"]) => void;
  isPending: boolean;
}) {
  const [claimNumber, setClaimNumber] = useState(editing?.claim_number ?? "");
  const [policyId, setPolicyId] = useState(editing?.policy_id ?? "");
  const [status, setStatus] = useState<Database["public"]["Enums"]["claim_status"]>(
    editing?.status ?? "open"
  );
  const [occurrenceDate, setOccurrenceDate] = useState(editing?.occurrence_date ?? "");
  const [amount, setAmount] = useState(editing?.amount ?? 0);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [resolutionDate, setResolutionDate] = useState(editing?.resolution_date ?? "");

  const { data: policies } = useQuery({
    queryKey: ["policies-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policies")
        .select("id, policy_number, clients(id, full_name)")
        .order("policy_number");
      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar sinistro" : "Registrar sinistro"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="claimNumber">Número do sinistro *</Label>
              <Input id="claimNumber" value={claimNumber} onChange={(e) => setClaimNumber(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Database["public"]["Enums"]["claim_status"])}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Encerrado</SelectItem>
                  <SelectItem value="denied">Negado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Apólice *</Label>
            <Select value={policyId} onValueChange={setPolicyId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {policies?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {(p as any).policy_number} — {(p as any).clients?.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="occurrenceDate">Data da ocorrência *</Label>
              <Input id="occurrenceDate" type="date" value={occurrenceDate} onChange={(e) => setOccurrenceDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor estimado (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resolutionDate">Data de resolução</Label>
              <Input id="resolutionDate" type="date" value={resolutionDate} onChange={(e) => setResolutionDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={isPending || !claimNumber.trim() || !policyId || !occurrenceDate || !description.trim()}
            onClick={() =>
              onSubmit({
                claim_number: claimNumber,
                policy_id: policyId,
                status,
                occurrence_date: occurrenceDate,
                amount,
                description,
                notes: notes || null,
                resolution_date: resolutionDate || null,
              })
            }
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function claimStatusVariant(status: string | null) {
  switch (status) {
    case "open":
      return "default";
    case "in_progress":
      return "secondary";
    case "resolved":
      return "default";
    case "closed":
      return "outline";
    case "denied":
      return "destructive";
    default:
      return "secondary";
  }
}

function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

