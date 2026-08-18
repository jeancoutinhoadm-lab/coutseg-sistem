import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";

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
                <TableHead>Apólice</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Previsto</TableHead>
                <TableHead>Recebido</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{(c.policies as any)?.policy_number}</TableCell>
                  <TableCell>{(c.policies as any)?.clients?.full_name}</TableCell>
                  <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.expected_amount)}</TableCell>
                  <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.received_amount || 0)}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'divergent' ? 'destructive' : c.status === 'paid' ? 'default' : 'secondary'}>
                      {c.status}
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
