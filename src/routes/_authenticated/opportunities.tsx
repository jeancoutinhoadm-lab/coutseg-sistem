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
  RefreshCw,
  Plus,
  Phone,
  Mail,
  History,
  FileText,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { convertLeadToOpportunity, markOpportunityAsLost } from "@/lib/crm.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type OpportunityStatus = "new" | "contacted" | "quoting" | "negotiating" | "won" | "lost" | "deferred";
type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost" | "rejected";

export const Route = createFileRoute("/_authenticated/opportunities")({
  component: CRMPage,
  head: () => ({
    meta: [
      { title: "CRM & Oportunidades - Coutseg" },
      { name: "description", content: "Pipeline comercial, gestão de leads e oportunidades de venda." },
    ],
  }),
});

function CRMPage() {
  const [activeTab, setActiveTab] = useState<"leads" | "opportunities">("opportunities");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [isLossModalOpen, setIsLossModalOpen] = useState(false);
  const [lossReason, setLossReason] = useState("");
  
  const queryClient = useQueryClient();
  const convertLead = useServerFn(convertLeadToOpportunity);
  const markLost = useServerFn(markOpportunityAsLost);

  // Queries
  const { data: leads, isLoading: isLoadingLeads } = useQuery({
    queryKey: ["leads", statusFilter, search],
    queryFn: async () => {
      let query = supabase.from("leads").select("*, brokers(full_name)");
      if (statusFilter !== "all") query = query.eq("status", statusFilter as any);
      if (search) query = query.ilike("full_name", `%${search}%`);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: activeTab === "leads"
  });

  const { data: opportunities, isLoading: isLoadingOpps } = useQuery({
    queryKey: ["opportunities", statusFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("opportunities")
        .select("*, clients(full_name), products(name), brokers(full_name), leads(full_name)");
      
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      
      const { data, error } = await query.order("priority", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: activeTab === "opportunities"
  });

  const { data: activities } = useQuery({
    queryKey: ["crm-activities", selectedOpportunity?.id],
    queryFn: async () => {
      if (!selectedOpportunity?.id) return [];
      const { data, error } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("opportunity_id", selectedOpportunity.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOpportunity
  });

  // Mutations
  const convertLeadMutation = useMutation({
    mutationFn: (leadId: string) => convertLead({ data: { leadId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Lead convertido com sucesso!");
    },
    onError: (err: any) => toast.error("Erro na conversão: " + err.message)
  });

  const lossMutation = useMutation({
    mutationFn: () => markLost({ data: { opportunityId: selectedOpportunity.id, reason: lossReason } }),
    onSuccess: () => {
      setIsLossModalOpen(false);
      setSelectedOpportunity(null);
      setLossReason("");
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade marcada como perdida.");
    }
  });

  const getStatusBadge = (status: string, type: 'lead' | 'opp') => {
    const variants: Record<string, any> = {
      new: { label: "Novo", color: "bg-blue-100 text-blue-700" },
      contacted: { label: "Contatado", color: "bg-yellow-100 text-yellow-700" },
      qualified: { label: "Qualificado", color: "bg-green-100 text-green-700" },
      converted: { label: "Convertido", color: "bg-emerald-100 text-emerald-700" },
      quoting: { label: "Cotando", color: "bg-purple-100 text-purple-700" },
      negotiating: { label: "Negociando", color: "bg-orange-100 text-orange-700" },
      won: { label: "Ganha", color: "bg-green-100 text-green-700" },
      lost: { label: "Perdida", color: "bg-red-100 text-red-700" },
      rejected: { label: "Rejeitado", color: "bg-gray-100 text-gray-700" },
    };
    const config = variants[status] || { label: status, color: "bg-gray-100" };
    return <Badge className={`${config.color} border-none font-medium`}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centro Comercial CRM</h1>
          <p className="text-muted-foreground">Gestão de Leads, Pipeline de Vendas e Oportunidades.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Relatórios
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Lead
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
          <TabsTrigger value="leads">Leads (Entrada)</TabsTrigger>
        </TabsList>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {activeTab === 'leads' ? (
                <>
                  <SelectItem value="new">Novos</SelectItem>
                  <SelectItem value="contacted">Contatados</SelectItem>
                  <SelectItem value="converted">Convertidos</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="new">Novas</SelectItem>
                  <SelectItem value="quoting">Cotando</SelectItem>
                  <SelectItem value="negotiating">Negociando</SelectItem>
                  <SelectItem value="won">Ganhas</SelectItem>
                  <SelectItem value="lost">Perdidas</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="leads" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Broker</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingLeads ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : leads?.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.full_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone || '-'}</span>
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{lead.source || 'Manual'}</TableCell>
                      <TableCell>{(lead.brokers as any)?.full_name || '-'}</TableCell>
                      <TableCell>{getStatusBadge(lead.status || 'new', 'lead')}</TableCell>
                      <TableCell className="text-right">
                        {lead.status !== 'converted' && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => convertLeadMutation.mutate(lead.id)}
                            disabled={convertLeadMutation.isPending}
                          >
                            Converter
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-3">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Oportunidade</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor Est.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingOpps ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
                    ) : opportunities?.map((opp) => (
                      <TableRow 
                        key={opp.id} 
                        className={`cursor-pointer hover:bg-muted/50 ${selectedOpportunity?.id === opp.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedOpportunity(opp)}
                      >
                        <TableCell>
                          <div className="font-medium">{(opp.products as any)?.name || 'Produto não def.'}</div>
                          <div className="text-xs text-muted-foreground">Criada em {new Date(opp.created_at!).toLocaleDateString('pt-BR')}</div>
                        </TableCell>
                        <TableCell>{(opp.clients as any)?.full_name || (opp.leads as any)?.full_name}</TableCell>
                        <TableCell>{opp.value_estimated ? `R$ ${Number(opp.value_estimated).toLocaleString('pt-BR')}` : '-'}</TableCell>
                        <TableCell>{getStatusBadge(opp.status || 'new', 'opp')}</TableCell>
                        <TableCell>
                           <Badge variant={opp.priority === 'high' ? 'destructive' : 'outline'}>
                             {opp.priority}
                           </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {selectedOpportunity ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Detalhes</CardTitle>
                    <CardDescription>Ações rápidas para esta oportunidade</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                        <FileText className="mr-2 h-3 w-3" /> Cotações
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                        <DollarSign className="mr-2 h-3 w-3" /> Venda
                      </Button>
                    </div>
                    <Button 
                      variant="destructive" 
                      className="w-full text-xs" 
                      size="sm"
                      onClick={() => setIsLossModalOpen(true)}
                      disabled={selectedOpportunity.status === 'lost' || selectedOpportunity.status === 'won'}
                    >
                      <XCircle className="mr-2 h-3 w-3" /> Perda Total
                    </Button>

                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <History className="h-4 w-4" /> Timeline
                      </h4>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {activities?.map((act: any) => (
                          <div key={act.id} className="text-xs border-l-2 border-primary/20 pl-3 py-1">
                            <p className="font-medium text-muted-foreground">
                              {new Date(act.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p>{act.description}</p>
                          </div>
                        ))}
                        {(!activities || activities.length === 0) && (
                          <p className="text-xs text-muted-foreground italic text-center py-4">Sem atividades registradas.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                   <div className="space-y-2">
                     <AlertCircle className="h-8 w-8 mx-auto opacity-20" />
                     <p>Selecione uma oportunidade para ver detalhes e timeline</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Loss Modal */}
      <Dialog open={isLossModalOpen} onOpenChange={setIsLossModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Perda de Oportunidade</DialogTitle>
            <DialogDescription>
              Por que esta oportunidade não foi fechada? Este dado é vital para auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo da Perda</Label>
              <Select value={lossReason} onValueChange={setLossReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Preço alto</SelectItem>
                  <SelectItem value="competitor">Fechou com concorrente</SelectItem>
                  <SelectItem value="coverage">Falta de cobertura</SelectItem>
                  <SelectItem value="no_interest">Sem interesse no momento</SelectItem>
                  <SelectItem value="no_response">Sem retorno do cliente</SelectItem>
                  <SelectItem value="other">Outro (detalhar nas notas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsLossModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => lossMutation.mutate()} disabled={!lossReason || lossMutation.isPending}>
              Confirmar Perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
