import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, CalendarClock } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/renewals")({
  component: RenewalsPage,
  head: () => ({
    meta: [
      { title: "Renovações - Coutseg" },
      { name: "description", content: "Acompanhe as renovações de apólices da Coutseg" },
    ],
  }),
});

function RenewalsPage() {
  const [search, setSearch] = useState("");
  const [days, setDays] = useState(90);

  const today = startOfDay(new Date()).toISOString().split("T")[0];
  const until = addDays(new Date(), days).toISOString().split("T")[0];

  const { data: renewals, isLoading } = useQuery({
    queryKey: ["renewals", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policies")
        .select("*, clients(full_name), insurers(name), brokers(full_name)")
        .gte("renewal_date", today)
        .lte("renewal_date", until)
        .order("renewal_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = renewals?.filter((r) =>
    [r.policy_number, (r as any).clients?.full_name, (r as any).insurers?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Renovações</h1>
        <p className="text-muted-foreground">Apólices com vencimento em até {days} dias</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Buscar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por apólice, cliente ou seguradora..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-nowrap">Próximos</span>
              <Input
                type="number"
                value={days}
                onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 30))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">dias</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Apólices a renovar</CardTitle>
          </div>
        </CardHeader>
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
                  <TableHead>Apólice</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Seguradora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Renovação</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.length ? (
                  filtered.map((renewal: Database["public"]["Tables"]["policies"]["Row"] & any) => (
                    <TableRow key={renewal.id}>
                      <TableCell className="font-medium">{renewal.policy_number}</TableCell>
                      <TableCell>{renewal.clients?.full_name ?? "—"}</TableCell>
                      <TableCell>{renewal.insurers?.name ?? "—"}</TableCell>
                      <TableCell className="capitalize">{renewal.type}</TableCell>
                      <TableCell>
                        {renewal.renewal_date
                          ? format(new Date(renewal.renewal_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={renewal.status === "active" ? "default" : "secondary"}>
                          {renewal.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhuma renovação encontrada no período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
