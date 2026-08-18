import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  FileText,
  Building2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  CalendarClock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard - Coutseg" },
      { name: "description", content: "Visão geral da corretora de seguros Coutseg" },
      { property: "og:title", content: "Dashboard - Coutseg" },
      { property: "og:description", content: "Visão geral da corretora de seguros Coutseg" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

import { useAuth } from "@/hooks/use-auth";
import { logAudit } from "@/utils/audit";

function DashboardPage() {
  const { user, role } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    staleTime: Infinity,
    queryFn: async () => {
      await logAudit('VIEW', 'DASHBOARD');
      const [
        { count: clientsCount, error: clientsError },
        { count: policiesCount, error: policiesError },
        { count: insurersCount, error: insurersError },
        { count: claimsCount, error: claimsError },
        { data: policies, error: policiesDataError },
        { data: renewals, error: renewalsError },
      ] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("policies").select("*", { count: "exact", head: true }),
        supabase.from("insurers").select("*", { count: "exact", head: true }),
        supabase.from("claims").select("*", { count: "exact", head: true }),
        supabase.from("policies").select("premium, commission_amount, status").eq("status", "active"),
        supabase
          .from("policies")
          .select("id, policy_number, renewal_date, clients(full_name), insurers(name)")
          .gte("renewal_date", new Date().toISOString().split("T")[0])
          .lte("renewal_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
          .order("renewal_date", { ascending: true })
          .limit(5),
      ]);

      if (clientsError || policiesError || insurersError || claimsError || policiesDataError || renewalsError) {
        throw new Error("Erro ao carregar estatísticas");
      }

      const totalPremium = (policies ?? []).reduce((sum, p) => sum + (p.premium || 0), 0);
      const totalCommission = (policies ?? []).reduce((sum, p) => sum + (p.commission_amount || 0), 0);

      return {
        clients: clientsCount ?? 0,
        policies: policiesCount ?? 0,
        insurers: insurersCount ?? 0,
        claims: claimsCount ?? 0,
        totalPremium,
        totalCommission,
        renewals: renewals ?? [],
      };
    },
  });

  const cards = [
    { title: "Clientes", value: stats?.clients, icon: Users, description: "Total cadastrado" },
    { title: "Apólices", value: stats?.policies, icon: FileText, description: "Ativas e inativas" },
    { title: "Seguradoras", value: stats?.insurers, icon: Building2, description: "Parceiras" },
    { title: "Sinistros", value: stats?.claims, icon: AlertTriangle, description: "Registrados" },
    { title: "Prêmio ativo", value: formatCurrency(stats?.totalPremium), icon: DollarSign, description: "Soma de prêmios" },
    { title: "Comissões", value: formatCurrency(stats?.totalCommission), icon: TrendingUp, description: "Soma de comissões" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {role === "admin"
            ? "Visão Geral da Corretora"
            : role === "corretor"
              ? "Minha Produção"
              : "Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          {role === "admin"
            ? "Métricas globais da Coutseg"
            : "Acompanhe seus resultados e renovações"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)
          : cards
              .filter((card) => {
                if (role === "corretor") {
                  return !["Seguradoras", "Sinistros"].includes(card.title);
                }
                return true;
              })
              .map((card) => (
                <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{card.value ?? 0}</div>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Renovações próximas (30 dias)</CardTitle>
            <CardDescription>Apólices com vencimento em breve</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40" />
          ) : stats?.renewals && stats.renewals.length > 0 ? (
            <div className="space-y-3">
              {stats.renewals.map((renewal: any) => (
                <div key={renewal.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{renewal.policy_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {renewal.clients?.full_name} — {renewal.insurers?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {renewal.renewal_date
                        ? format(new Date(renewal.renewal_date + "T00:00:00"), "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma renovação próxima.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatCurrency(value?: number) {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
