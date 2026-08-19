import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.reported_amount || 0)}
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
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhuma comissão registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
