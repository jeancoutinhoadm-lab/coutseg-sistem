import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/renewals")({
  component: RenewalsPage,
});

function RenewalsPage() {
  const { data: renewals, isLoading } = useQuery({
    queryKey: ["renewals-list"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("policies")
        .select("*, clients(full_name), insurers(name)")
        .gte("end_date", today)
        .order("end_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Renovações</h1>
        <p className="text-muted-foreground">Apólices próximas ao vencimento.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vigências a Encerrar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Apólice</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Dias Restantes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renewals?.map((r) => {
                const days = differenceInDays(new Date(r.end_date), new Date());
                return (
                  <TableRow key={r.id}>
                    <TableCell>{(r.clients as any)?.full_name}</TableCell>
                    <TableCell>{r.policy_number}</TableCell>
                    <TableCell>{format(new Date(r.end_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell>
                       <span className={days < 15 ? "text-red-600 font-bold" : days < 30 ? "text-amber-600 font-bold" : ""}>
                         {days} dias
                       </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={days < 15 ? "destructive" : "secondary"}>
                        {days < 30 ? "Urgente" : "No Prazo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
