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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Search, 
  Filter, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Package,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type OpportunityStatus = "new" | "contacted" | "quoting" | "negotiating" | "won" | "lost" | "deferred" | "rejected";

export const Route = createFileRoute("/_authenticated/opportunities" as any)({
  component: OpportunitiesPage,
  head: () => ({
    meta: [
      { title: "Oportunidades de Negócio - Coutseg" },
      { name: "description", content: "Pipeline de cross-sell e oportunidades comerciais geradas pelo sistema." },
    ],
  }),
});

function OpportunitiesPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ["opportunities-list", filter],
    queryFn: async () => {
      let query = supabase
        .from("opportunities")
        .select("*, clients(full_name), products(name), brokers(full_name)")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: crossSellRules } = useQuery({
    queryKey: ["cross-sell-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cross_sell_rules").select("*");
      if (error) throw error;
      return data;
    }
  });

  const generateOpportunitiesMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Get all active clients and their current active policies
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, full_name, broker_id");
      
      if (clientsError) throw clientsError;

      const { data: activePolicies, error: policiesError } = await supabase
        .from("policies")
        .select("client_id, type")
        .eq("status", "active");
      
      if (policiesError) throw policiesError;

      // Step 2: Get cross-sell rules
      const { data: rules, error: rulesError } = await supabase
        .from("cross_sell_rules")
        .select("*")
        .eq("active", true);
      
      if (rulesError) throw rulesError;

      // Step 3: Identify missing products based on rules
      let newCount = 0;
      for (const client of clients) {
        const clientProductTypes = activePolicies
          .filter(p => p.client_id === client.id)
          .map(p => p.type.toLowerCase());

        for (const rule of rules) {
          // Simplistic rule logic based on policy types for now
          // In a real scenario, this would match rule.source_product_id
          const hasSource = clientProductTypes.some(t => t.includes('auto')); // Example: If has Auto
          const hasTarget = clientProductTypes.some(t => t.includes('home')); // Check if has Home

          if (hasSource && !hasTarget) {
            // Check if opportunity already exists
            const { data: existing } = await supabase
              .from("opportunities")
              .select("id")
              .eq("client_id", client.id)
              .eq("rule_id", rule.id)
              .single();

            if (!existing) {
              await supabase.from("opportunities").insert({
                client_id: client.id,
                product_id: rule.target_product_id,
                broker_id: client.broker_id,
                status: "new",
                priority: "normal",
                rule_id: rule.id,
                evidence: `Cliente possui apólice ativa do tipo Auto, mas não possui Residencial. Regra: ${rule.description}`
              });
              newCount++;
            }
          }
        }
      }
      return newCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities-list"] });
      toast.success(`${count} novas oportunidades identificadas`);
    },
    onError: (err) => {
      toast.error("Erro ao gerar oportunidades", { description: err.message });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: OpportunityStatus }) => {
      const { error } = await supabase
        .from("opportunities")
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities-list"] });
      toast.success("Status atualizado");
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      new: { label: "Nova", color: "bg-blue-100 text-blue-700 border-blue-200" },
      contacted: { label: "Contatada", color: "bg-amber-100 text-amber-700 border-amber-200" },
      quoting: { label: "Cotando", color: "bg-purple-100 text-purple-700 border-purple-200" },
      negotiating: { label: "Em Negociação", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
      won: { label: "Ganha", color: "bg-green-100 text-green-700 border-green-200" },
      lost: { label: "Perdida", color: "bg-red-100 text-red-700 border-red-200" },
      rejected: { label: "Rejeitada", color: "bg-slate-100 text-slate-700 border-slate-200" },
    };
    const config = variants[status] || { label: status, color: "bg-gray-100" };
    return <Badge className={`${config.color} border font-medium`}>{config.label}</Badge>;
  };

  const filtered = opportunities?.filter(o => 
    (o.clients as any)?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    (o.products as any)?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Oportunidades Comerciais</h1>
          <p className="text-muted-foreground">Pipeline de Cross-sell baseado na carteira existente.</p>
        </div>
        <Button 
          onClick={() => generateOpportunitiesMutation.mutate()}
          disabled={generateOpportunitiesMutation.isPending}
        >
          {generateOpportunitiesMutation.isPending ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <TrendingUp className="mr-2 h-4 w-4" />
          )}
          Identificar Oportunidades
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar cliente ou produto..."
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
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="new">Novas</SelectItem>
              <SelectItem value="contacted">Contatadas</SelectItem>
              <SelectItem value="quoting">Cotando</SelectItem>
              <SelectItem value="won">Ganhas</SelectItem>
              <SelectItem value="rejected">Rejeitadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto Alvo</TableHead>
                <TableHead>Evidência / Motivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gerada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma oportunidade encontrada. Clique em "Identificar Oportunidades" para analisar a carteira.
                  </TableCell>
                </TableRow>
              ) : (
                filtered?.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{(o.clients as any)?.full_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{(o.products as any)?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground line-clamp-2" title={(o as any).evidence}>
                        {(o as any).evidence || "Regra de cross-sell detectada."}
                      </p>
                    </TableCell>
                    <TableCell>{getStatusBadge(o.status || "new")}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(o.created_at!).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {o.status === 'new' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => updateStatusMutation.mutate({ id: o.id, status: 'contacted' })}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Contatar
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-600"
                              onClick={() => updateStatusMutation.mutate({ id: o.id, status: 'rejected' })}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Rejeitar
                            </Button>
                          </>
                        )}
                        {o.status !== 'won' && o.status !== 'rejected' && (
                           <Button variant="ghost" size="sm" asChild>
                              <a href={`/clients?search=${(o.clients as any)?.full_name}`}>
                                Ver Cliente
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </a>
                           </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
