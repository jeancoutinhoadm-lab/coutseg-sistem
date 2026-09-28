import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DollarSign, AlertCircle, CheckCircle2, History, Scale } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";


export const Route = createFileRoute("/_authenticated/commissions")({
  component: CommissionsPage,
  head: () => ({
    meta: [
      { title: "Comissões - Coutseg" },
    ],
  }),
});

function CommissionsPage() {
  const queryClient = useQueryClient();
  const { data: commissions, isLoading } = useQuery({
    queryKey: ["commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("*, policies(policy_number, clients(full_name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reconciliationItems, isLoading: isLoadingQueue } = useQuery({
    queryKey: ["commission-report-reconciliation-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_report_items")
        .select("*")
        .neq("match_status", "posted")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const confirmReceipt = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.rpc("confirm_commission_report_item", { _item_id: itemId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recebimento confirmado e registrado.");
      queryClient.invalidateQueries({ queryKey: ["commission-report-reconciliation-queue"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
    },
    onError: (error: Error) => toast.error(`Não foi possível registrar o recebimento: ${error.message}`),
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Comissões</h1>
        <p className="text-muted-foreground">Gestão e conciliação de recebimentos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Extrato de Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase">Vigência/Venc.</TableHead>
                <TableHead className="text-xs uppercase">Apólice / Cliente / Produto</TableHead>
                <TableHead className="text-xs uppercase text-right">Previsto (Sistema)</TableHead>
                <TableHead className="text-xs uppercase text-right">Informado (Cia)</TableHead>
                <TableHead className="text-xs uppercase text-right">Divergência</TableHead>
                <TableHead className="text-xs uppercase text-center">Status</TableHead>
              </TableRow>

            </TableHeader>
            <TableBody>
              {commissions?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">
                    {c.due_date ? format(new Date(c.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-sm">{(c.policies as any)?.policy_number || 'S/N'}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{(c.policies as any)?.clients?.full_name}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.expected_amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.received_amount ?? c.reported_amount ?? 0)}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm font-bold ${Number(c.divergence_amount) !== 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.divergence_amount || 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="text-[10px] uppercase font-bold" variant={
                      c.status === 'divergent' ? 'destructive' : 
                      c.status === 'reconciled' ? 'outline' : 
                      c.status === 'matched' ? 'default' : 'secondary'
                    }>
                      {c.status === 'divergent' ? 'Divergente' : 
                       c.status === 'reconciled' ? 'Conciliado' : 
                       c.status === 'matched' ? 'Conferido' : c.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}

              {commissions?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhuma comissão registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fila de conciliação de extratos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase">Referência</TableHead>
                <TableHead className="text-xs uppercase">Apólice normalizada</TableHead>
                <TableHead className="text-xs uppercase text-right">Previsto</TableHead>
                <TableHead className="text-xs uppercase text-right">Informado</TableHead>
                <TableHead className="text-xs uppercase">Resultado</TableHead>
                <TableHead className="text-xs uppercase text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reconciliationItems?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs">{item.report_reference || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{item.policy_number_normalized || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{item.expected_amount == null ? "—" : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.expected_amount)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{item.reported_amount == null ? "—" : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.reported_amount)}</TableCell>
                  <TableCell>
                    <Badge variant={item.match_status === 'divergent' ? 'destructive' : item.match_status === 'matched' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                      {item.match_status === 'matched' ? 'Conferido' : item.match_status === 'divergent' ? 'Divergente' : 'Pendente'}
                    </Badge>
                    <div className="mt-1 text-[10px] text-muted-foreground">{item.reconciliation_reason}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {(item.match_status === 'matched' || item.match_status === 'divergent') ? (
                      <Button size="sm" variant="outline" disabled={confirmReceipt.isPending} onClick={() => confirmReceipt.mutate(item.id)}>
                        Confirmar recebimento
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">Revisão necessária</span>}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoadingQueue && reconciliationItems?.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Nenhum item pendente de conciliação.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
