import { createFileRoute } from "@tanstack/react-router";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  History,
  ArrowLeft,
  Upload,
  Check,
  AlertTriangle,
  Loader2,
  DollarSign,
} from "lucide-react";
import { validateOperationProgress, completeOperation } from "@/lib/operations.functions";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";



export const Route = createFileRoute("/_authenticated/operations/$id")({
  component: OperationDetailsPage,
});

function OperationDetailsPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const validateFn = useServerFn(validateOperationProgress);
  const completeFn = useServerFn(completeOperation);
  const [isUploading, setIsUploading] = useState(false);
  const [isRegisteringCommission, setIsRegisteringCommission] = useState(false);
  const [commissionAmount, setCommissionAmount] = useState("");


  const { data, isLoading } = useQuery({
    queryKey: ["operation-details", id],
    queryFn: () => validateFn({ data: { operationId: id } }),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from("operation_checklists")
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        } as any)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operation-details", id] });
      toast.success("Tarefa atualizada");
    },
  });

  const registerCommissionMutation = useMutation({
    mutationFn: async (amount: number) => {
      // Simular marcação de tarefa de comissão como concluída
      const commissionTask = data?.operation.operation_checklists?.find((t: any) => t.task_name.includes("Comissão"));
      if (commissionTask) {
        await toggleTaskMutation.mutateAsync({ taskId: commissionTask.id, completed: true });
      }
      toast.success("Comissão registrada e tarefa marcada!");
    },
    onSuccess: () => {
      setIsRegisteringCommission(false);
      queryClient.invalidateQueries({ queryKey: ["operation-details", id] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeFn({ data: { operationId: id } }),
    onSuccess: () => {
      toast.success("Operação concluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["operation-details", id] });
    },
    onError: (err: any) => {
      toast.error("Erro ao concluir: " + err.message);
    },
  });


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `operations/${id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("policy_documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Criar registro na tabela documents
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          size: file.size,
          client_id: data?.operation.client_id,
          policy_id: data?.operation.policy_id,
        } as any)
        .select()
        .single();

      if (docError) throw docError;

      const docTask = data?.operation.operation_checklists?.find((t: any) => t.task_name.includes("Documento"));
      if (docTask) {
        await toggleTaskMutation.mutateAsync({ taskId: docTask.id, completed: true });
      }

      toast.success("Documento enviado e checklist atualizado!");

    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: ["operation-details", id] });
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const operation = data?.operation;
  if (!operation) return <div>Operação não encontrada</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{operation.title}</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">
            {operation.type} • {operation.status}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Checklist da Operação</CardTitle>
            <CardDescription>Conclua as etapas obrigatórias para finalizar.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {operation.operation_checklists?.map((item: any) => (
                <div 
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-4 border rounded-lg",
                    item.is_completed ? "bg-muted/50" : "bg-card"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className={cn(
                        "h-6 w-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors",
                        item.is_completed ? "bg-primary border-primary text-white" : "border-muted-foreground"
                      )}
                      onClick={() => toggleTaskMutation.mutate({ taskId: item.id, completed: !item.is_completed })}
                    >
                      {item.is_completed && <Check className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", item.is_completed && "line-through text-muted-foreground")}>
                        {item.task_name}
                      </p>
                      {item.required && <Badge variant="outline" className="text-[10px] uppercase text-amber-600 border-amber-600">Obrigatório</Badge>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.task_name.includes("Documento") && (
                      <div className="relative">
                        <Button variant="outline" size="sm" disabled={isUploading}>
                          {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Upload className="h-3 w-3 mr-2" />}
                          Anexar
                        </Button>
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                      </div>
                    )}
                    {item.task_name.includes("Comissão") && (
                      <Button variant="outline" size="sm" onClick={() => setIsRegisteringCommission(true)}>
                        <DollarSign className="h-3 w-3 mr-2" /> Definir
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Total de Tarefas</span>
                <span className="font-bold">{operation.operation_checklists?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Pendências Obrigatórias</span>
                <span className={cn("font-bold", data?.pendingRequired.length > 0 ? "text-amber-600" : "text-green-600")}>
                  {data?.pendingRequired.length || 0}
                </span>
              </div>
            </div>

            {data?.pendingRequired.length > 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <p className="font-bold mb-1">Operação Bloqueada</p>
                  <p>Existem requisitos obrigatórios pendentes no checklist.</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3 items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div className="text-xs text-green-800">
                  <p className="font-bold mb-1">Tudo Pronto!</p>
                  <p>Todos os requisitos foram atendidos.</p>
                </div>
              </div>
            )}

            <Button 
              className="w-full h-12 text-lg" 
              disabled={!data?.isReady || operation.status === 'completed' || completeMutation.isPending}
              onClick={() => completeMutation.mutate()}
            >
              {completeMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Concluir Operação"}
            </Button>

          </CardContent>
        </Card>
      </div>

      <Dialog open={isRegisteringCommission} onOpenChange={setIsRegisteringCommission}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Comissão Prevista</DialogTitle>
            <DialogDescription>Defina o valor esperado para esta apólice.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Valor da Comissão (R$)</Label>
              <Input 
                type="number" 
                step="0.01"
                value={commissionAmount}
                onChange={(e) => setCommissionAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegisteringCommission(false)}>Cancelar</Button>
            <Button 
              onClick={() => registerCommissionMutation.mutate(Number(commissionAmount))}
              disabled={registerCommissionMutation.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
