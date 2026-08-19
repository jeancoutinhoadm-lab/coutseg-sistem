import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, differenceInDays, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CalendarClock, 
  Search, 
  Filter, 
  History, 
  User, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type PolicyStatus = Database["public"]["Enums"]["policy_status"];
type Priority = "urgent" | "high" | "normal" | "low";

export const Route = createFileRoute("/_authenticated/renewals")({
  component: RenewalsPage,
  head: () => ({
    meta: [
      { title: "Central de Renovações - Coutseg" },
      { name: "description", content: "Gerencie as apólices próximas ao vencimento e o pipeline de renovação." },
    ],
  }),
});

function RenewalsPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [newAction, setNewAction] = useState({ action: "", notes: "" });
  const queryClient = useQueryClient();

  const { data: renewals, isLoading } = useQuery({
    queryKey: ["renewals-list", filter],
    queryFn: async () => {
      let query = supabase
        .from("policies")
        .select("*, clients(full_name), insurers(name), profiles:responsible_user_id(full_name)")
        .order("end_date", { ascending: true });

      const today = startOfDay(new Date());
      
      if (filter === "today") {
        query = query.eq("end_date", today.toISOString().split("T")[0] as string);
      } else if (filter === "7days") {
        query = query.lte("end_date", addDays(today, 7).toISOString().split("T")[0]).gte("end_date", today.toISOString().split("T")[0]);
      } else if (filter === "15days") {
        query = query.lte("end_date", addDays(today, 15).toISOString().split("T")[0]).gte("end_date", today.toISOString().split("T")[0]);
      } else if (filter === "30days") {
        query = query.lte("end_date", addDays(today, 30).toISOString().split("T")[0]).gte("end_date", today.toISOString().split("T")[0]);
      } else if (filter === "expired") {
        query = query.lt("end_date", today.toISOString().split("T")[0]).not("status", "in", '("renewed","lost","cancelled")');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["renewal-history", selectedPolicy?.id],
    enabled: !!selectedPolicy?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renewal_history")
        .select("*, profiles:user_id(full_name)")
        .eq("policy_id", selectedPolicy.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, action, notes }: { id: string, status: PolicyStatus, action: string, notes: string }) => {
      const { error: updateError } = await supabase
        .from("policies")
        .update({ status } as any)
        .eq("id", id);
      
      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from("renewal_history")
        .insert({
          policy_id: id,
          action,
          notes
        });
      
      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renewals-list"] });
      queryClient.invalidateQueries({ queryKey: ["renewal-history"] });
      setActionDialogOpen(false);
      setNewAction({ action: "", notes: "" });
      toast.success("Status atualizado com sucesso");
    },
    onError: (err) => {
      toast.error("Erro ao atualizar status", { description: err.message });
    }
  });

  const getPriority = (endDate: string): Priority => {
    const days = differenceInDays(new Date(endDate + "T00:00:00"), new Date());
    if (days <= 7) return "urgent";
    if (days <= 30) return "high";
    if (days <= 60) return "normal";
    return "low";
  };

  const getPriorityBadge = (priority: Priority) => {
    const variants: Record<Priority, any> = {
      urgent: { label: "URGENTE", color: "bg-red-100 text-red-700 border-red-200" },
      high: { label: "ALTA", color: "bg-orange-100 text-orange-700 border-orange-200" },
      normal: { label: "NORMAL", color: "bg-blue-100 text-blue-700 border-blue-200" },
      low: { label: "BAIXA", color: "bg-slate-100 text-slate-700 border-slate-200" },
    };
    const config = variants[priority];
    return <Badge className={`${config.color} border font-bold px-2 py-0.5`}>{config.label}</Badge>;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      upcoming: "Futura",
      contact_pending: "Pendente de Contato",
      contacted: "Contatado",
      quote_in_progress: "Cotação em Andamento",
      quote_sent: "Cotação Enviada",
      negotiation: "Em Negociação",
      renewed: "Renovada",
      lost: "Perdida",
      cancelled: "Cancelada",
      active: "Ativa",
      expired: "Vencida"
    };
    return labels[status] || status;
  };

  const filtered = renewals?.filter(r => 
    (r.clients as any)?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.policy_number?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: renewals?.length ?? 0,
    urgent: renewals?.filter(r => getPriority(r.end_date) === "urgent").length ?? 0,
    inProgress: renewals?.filter(r => ["contacted", "quote_in_progress", "quote_sent", "negotiation"].includes(r.status || "")).length ?? 0,
    expired: renewals?.filter(r => differenceInDays(new Date(r.end_date + "T00:00:00"), new Date()) < 0).length ?? 0,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Central de Renovações</h1>
          <p className="text-muted-foreground">Monitore e gerencie o ciclo de renovação da sua carteira.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Renovações</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgentes (7 dias)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <XCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar cliente ou apólice..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrar por prazo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="today">Vence Hoje</SelectItem>
              <SelectItem value="7days">Próximos 7 dias</SelectItem>
              <SelectItem value="15days">Próximos 15 dias</SelectItem>
              <SelectItem value="30days">Próximos 30 dias</SelectItem>
              <SelectItem value="expired">Vencidas (sem ação)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prioridade</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Apólice / Seguradora</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma renovação encontrada para este filtro.</TableCell>
                </TableRow>
              ) : (
                filtered?.map((r) => {
                  const days = differenceInDays(new Date(r.end_date + "T00:00:00"), new Date());
                  const priority = getPriority(r.end_date);
                  
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{getPriorityBadge(priority)}</TableCell>
                      <TableCell className="font-medium">{(r.clients as any)?.full_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{r.policy_number}</span>
                          <span className="text-xs text-muted-foreground">{(r.insurers as any)?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{format(new Date(r.end_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}</span>
                          <span className={`text-xs font-bold ${days < 0 ? "text-red-500" : days <= 7 ? "text-red-600" : days <= 30 ? "text-amber-600" : "text-muted-foreground"}`}>
                            {days < 0 ? "Vencida" : days === 0 ? "HOJE" : `Em ${days} dias`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {getStatusLabel(r.status || "active")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{(r as any).profiles?.full_name || "Não atribuído"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Histórico"
                            onClick={() => {
                              setSelectedPolicy(r);
                              setHistoryDialogOpen(true);
                            }}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Atualizar Status"
                            onClick={() => {
                              setSelectedPolicy(r);
                              setNewAction({ action: "", notes: "" });
                              setActionDialogOpen(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Histórico */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Renovação</DialogTitle>
            <DialogDescription>
              Ações realizadas para a apólice {selectedPolicy?.policy_number} - {(selectedPolicy?.clients as any)?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {history?.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">Nenhum histórico registrado ainda.</p>
            ) : (
              history?.map((h) => (
                <div key={h.id} className="border-l-2 border-primary/20 pl-4 py-1 relative">
                  <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-primary" />
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{h.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(h.created_at!), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{h.notes}</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <User className="h-2 w-2" />
                    <span>{(h as any).profiles?.full_name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Ação/Status */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Ação e Atualizar Status</DialogTitle>
            <DialogDescription>
              Selecione o novo status da renovação e descreva a ação realizada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Novo Status</label>
              <Select 
                onValueChange={(v) => setNewAction({...newAction, action: `Status alterado para ${getStatusLabel(v)}`})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact_pending">Pendente de Contato</SelectItem>
                  <SelectItem value="contacted">Contatado</SelectItem>
                  <SelectItem value="quote_in_progress">Cotação em Andamento</SelectItem>
                  <SelectItem value="quote_sent">Cotação Enviada</SelectItem>
                  <SelectItem value="negotiation">Em Negociação</SelectItem>
                  <SelectItem value="renewed">Renovada</SelectItem>
                  <SelectItem value="lost">Perdida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações / Detalhes</label>
              <Textarea 
                placeholder="Ex: Liguei para o cliente e ele pediu cotação com franquia reduzida."
                value={newAction.notes}
                onChange={(e) => setNewAction({...newAction, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancelar</Button>
            <Button 
              disabled={!newAction.action || !selectedPolicy?.id || updateStatusMutation.isPending}
              onClick={() => {
                if (!selectedPolicy?.id) return;
                const statusLabel = newAction.action.split("para ")[1];
                if (!statusLabel) return;
                // Map label back to enum
                const statusMap: Record<string, PolicyStatus> = {
                  "Pendente de Contato": "contact_pending" as any,
                  "Contatado": "contacted" as any,
                  "Cotação em Andamento": "quote_in_progress" as any,
                  "Cotação Enviada": "quote_sent" as any,
                  "Em Negociação": "negotiation" as any,
                  "Renovada": "renewed" as any,
                  "Perdida": "lost" as any
                };
                const newStatus = statusMap[statusLabel as string];
                if (!newStatus) return;
                
                updateStatusMutation.mutate({
                  id: selectedPolicy.id,
                  status: newStatus,
                  action: newAction.action,
                  notes: newAction.notes
                });
              }}
            >
              {updateStatusMutation.isPending && <Clock className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Ação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
