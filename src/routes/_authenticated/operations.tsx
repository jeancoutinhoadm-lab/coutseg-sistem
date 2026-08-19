import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Search,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  History,
  Filter,
  Check,
  AlertTriangle,
} from "lucide-react";
import { createOperation, searchOperationTarget, createInlineClient } from "@/lib/operations.functions";
import { formatDisplayDate } from "@/lib/date-utils";
import { useServerFn } from "@tanstack/react-start";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/operations")({
  component: OperationsPage,
});

function OperationsPage() {
  const [isNewOpModalOpen, setIsNewOpModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [step, setStep] = useState(1);
  const [foundClients, setFoundClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [opTitle, setOpTitle] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    full_name: "",
    cpf_cnpj: "",
    phone: "",
    email: "",
    address: "",
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const searchFn = useServerFn(searchOperationTarget);
  const createFn = useServerFn(createOperation);
  const createClientFn = useServerFn(createInlineClient);

  // Listar operações existentes
  const { data: operations, isLoading } = useQuery({
    queryKey: ["operations-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operations")
        .select(`
          id,
          type,
          status,
          title,
          created_at,
          client_id,
          responsible_id,
          clients (full_name, cpf_cnpj)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const searchMutation = useMutation({
    mutationFn: (query: string) => searchFn({ data: { query } }),
    onSuccess: (data) => {
      setFoundClients(data);
      if (data.length === 0) {
        toast.info("Nenhum cliente encontrado. Você poderá cadastrar um novo.");
      }
    },
  });

  const inlineClientMutation = useMutation({
    mutationFn: (variables: any) => createClientFn({ data: variables }),
    onSuccess: (client) => {
      toast.success("Cliente cadastrado!");
      setSelectedClient(client);
      setIsCreatingClient(false);
      setStep(3);
    },
    onError: (err: any) => {
      toast.error("Erro ao cadastrar cliente: " + err.message);
    },
  });

  const createOpMutation = useMutation({
    mutationFn: (variables: any) => createFn({ data: variables }),
    onSuccess: (op) => {
      toast.success("Operação iniciada com sucesso!");
      setIsNewOpModalOpen(false);
      resetModal();
      queryClient.invalidateQueries({ queryKey: ["operations-list"] });
      // Redirecionar para detalhes da operação (próximo passo do plano)
      // navigate({ to: "/operations/$id", params: { id: op.id } });
    },
    onError: (err: any) => {
      toast.error("Erro ao iniciar operação: " + err.message);
    },
  });


  const resetModal = () => {
    setStep(1);
    setSearchQuery("");
    setSelectedType("");
    setFoundClients([]);
    setSelectedClient(null);
    setOpTitle("");
  };

  const handleStartSearch = () => {
    if (searchQuery.length < 3) {
      toast.warning("Digite pelo menos 3 caracteres para buscar.");
      return;
    }
    searchMutation.mutate(searchQuery);
  };

  const handleCreateNewClient = () => {
    toast.info("Redirecionando para cadastro de cliente... (em breve integração direta)");
  };

  const handleFinishStep2 = () => {
    if (!selectedClient) {
      toast.warning("Selecione um cliente ou cadastre um novo.");
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = () => {
    if (!opTitle) {
      toast.warning("Dê um título para a operação.");
      return;
    }
    createOpMutation.mutate({
      type: selectedType as any,
      title: opTitle,
      clientId: selectedClient.id,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Concluído</Badge>;
      case "draft":
        return <Badge variant="outline">Rascunho</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500">Em Andamento</Badge>;
      case "pending_docs":
        return <Badge className="bg-yellow-500">Pend. Docs</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      new_sale: "Venda Nova",
      renewal: "Renovação",
      endorsement: "Endosso",
      cancellation: "Cancelamento",
      update: "Atualização",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Central de Operações</h1>
          <p className="text-muted-foreground">
            Inicie e gerencie fluxos operacionais da CoutSeg.
          </p>
        </div>
        <Button onClick={() => setIsNewOpModalOpen(true)} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova Operação
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abertas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {operations?.filter((o) => o.status !== "completed").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {operations?.filter((o) => o.status === "completed").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Operações</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    Carregando operações...
                  </TableCell>
                </TableRow>
              ) : operations?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhuma operação registrada.
                  </TableCell>
                </TableRow>
              ) : (
                operations?.map((op: any) => (
                  <TableRow key={op.id}>
                    <TableCell className="text-xs">
                      {formatDisplayDate(op.created_at, "dd/MM/yy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{op.title}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {getTypeLabel(op.type)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{op.clients?.full_name || "-"}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {op.clients?.cpf_cnpj || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(op.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Abrir
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isNewOpModalOpen} onOpenChange={setIsNewOpModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Operação</DialogTitle>
            <DialogDescription>
              {step === 1 && "Selecione o tipo de operação que deseja realizar."}
              {step === 2 && "Busque o cliente pelo CPF/CNPJ, Telefone ou Nome."}
              {step === 3 && "Confirme os detalhes finais para iniciar."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {step === 1 && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "new_sale", label: "Venda Nova", icon: Plus },
                  { id: "renewal", label: "Renovação", icon: History },
                  { id: "endorsement", label: "Endosso", icon: FileText },
                  { id: "cancellation", label: "Cancelamento", icon: AlertCircle },
                  { id: "update", label: "Atualização", icon: User },
                ].map((t) => (
                  <Button
                    key={t.id}
                    variant={selectedType === t.id ? "default" : "outline"}
                    className="h-24 flex flex-col gap-2"
                    onClick={() => {
                      setSelectedType(t.id);
                      setStep(2);
                    }}
                  >
                    <t.icon className="h-6 w-6" />
                    {t.label}
                  </Button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="CPF, CNPJ, Nome ou Telefone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStartSearch()}
                  />
                  <Button onClick={handleStartSearch} disabled={searchMutation.isPending}>
                    {searchMutation.isPending ? "..." : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {foundClients.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted",
                        selectedClient?.id === c.id && "border-primary bg-primary/5"
                      )}
                      onClick={() => setSelectedClient(c)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">{c.full_name}</p>
                          <p className="text-xs text-muted-foreground">{c.cpf_cnpj}</p>
                        </div>
                        {selectedClient?.id === c.id && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}

                  {searchMutation.isSuccess && foundClients.length === 0 && (
                    <Button variant="outline" className="w-full" onClick={handleCreateNewClient}>
                      Cadastrar Novo Cliente
                    </Button>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Resumo da Operação
                  </p>
                  <p className="text-sm">
                    <strong>Tipo:</strong> {getTypeLabel(selectedType)}
                  </p>
                  <p className="text-sm">
                    <strong>Cliente:</strong> {selectedClient?.full_name}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Título da Operação</label>
                  <Input
                    placeholder="Ex: Seguro Auto - Renegociação"
                    value={opTitle}
                    onChange={(e) => setOpTitle(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                Voltar
              </Button>
            ) : (
              <div />
            )}
            
            {step === 2 && (
              <Button onClick={handleFinishStep2} disabled={!selectedClient}>
                Próximo
              </Button>
            )}

            {step === 3 && (
              <Button onClick={handleFinalSubmit} disabled={createOpMutation.isPending}>
                {createOpMutation.isPending ? "Iniciando..." : "Iniciar Operação"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
