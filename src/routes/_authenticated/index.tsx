import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  FileText,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Central de Operações - Coutseg" },
      { name: "description", content: "O que eu preciso fazer hoje na Coutseg?" },
    ],
  }),
});

function DashboardPage() {
  const { role } = useAuth();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const [
        { count: pendingDocs },
        { data: urgentRenewals },
        { data: divergentCommissions },
        { count: taskCount },
        { data: activePolicies },
      ] = await Promise.all([
        supabase.from("document_processing").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("policies").select("id, policy_number, end_date, clients(full_name)").lte("end_date", next7Days).gte("end_date", today).eq("status", "active"),
        supabase.from("commissions").select("id, expected_amount, received_amount").eq("status", "divergent"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("policies").select("premium, commission_amount").eq("status", "active"),
      ]);

      const totalPremium = (activePolicies ?? []).reduce((sum, p) => sum + (Number(p.premium) || 0), 0);
      const totalCommission = (activePolicies ?? []).reduce((sum, p) => sum + (Number(p.commission_amount) || 0), 0);

      return {
        pendingDocs: pendingDocs ?? 0,
        urgentRenewals: urgentRenewals ?? [],
        divergentCommissions: divergentCommissions ?? [],
        pendingTasks: Number(taskCount) ?? 0,
        totalPremium,
        totalCommission
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const sections = [
    {
      title: "URGENTE",
      icon: AlertCircle,
      color: "text-red-600",
      items: [
        {
          label: `${stats?.urgentRenewals.length} renovações vencendo em 7 dias`,
          to: "/renewals",
          active: (stats?.urgentRenewals.length ?? 0) > 0
        }
      ]
    },
    {
      title: "PENDENTE",
      icon: Clock,
      color: "text-amber-600",
      items: [
        {
          label: `${stats?.pendingDocs} documentos aguardando conferência`,
          to: "/central-entrada",
          active: (stats?.pendingDocs ?? 0) > 0
        },
        {
          label: `${stats?.pendingTasks} tarefas para hoje`,
          to: "/",
          active: (stats?.pendingTasks ?? 0) > 0
        }
      ]
    },
    {
      title: "FINANCEIRO",
      icon: DollarSign,
      color: "text-blue-600",
      items: [
        {
          label: `${stats?.divergentCommissions?.length ?? 0} comissões com divergência`,
          to: "/commissions",
          active: (stats?.divergentCommissions?.length ?? 0) > 0
        }
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">CENTRAL DE OPERAÇÕES</h1>
        <p className="text-muted-foreground text-lg">O que eu preciso fazer hoje?</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title} className="border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: section.color.includes('red') ? '#dc2626' : section.color.includes('amber') ? '#d97706' : '#2563eb' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-bold tracking-widest ${section.color}`}>{section.title}</CardTitle>
              <section.icon className={`h-5 w-5 ${section.color}`} />
            </CardHeader>
            <CardContent>
              <div className="space-y-4 pt-2">
                {section.items.map((item, idx) => (
                  <Link 
                    key={idx} 
                    to={item.to} 
                    className={`flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors ${!item.active && 'opacity-50 grayscale'}`}
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Métricas Rápidas (Produção Ativa)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-primary/5 border">
              <p className="text-sm text-muted-foreground mb-1">Prêmio Total</p>
              <p className="text-2xl font-bold">{formatCurrency(stats?.totalPremium)}</p>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border">
              <p className="text-sm text-muted-foreground mb-1">Comissão Prevista</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalCommission)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute right-[-20px] top-[-20px] opacity-10">
            <Inbox size={150} />
          </div>
          <CardHeader>
            <CardTitle>Central de Entrada</CardTitle>
            <CardDescription className="text-primary-foreground/70">Processe novos documentos agora</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-sm">
              Use a IA para extrair dados de apólices, boletos e relatórios automaticamente. 
              Elimine a digitação manual e reduza erros.
            </p>
            <Button asChild variant="secondary" className="w-full font-bold">
              <Link to="/central-entrada">Fazer Upload de Documento</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatCurrency(value?: number) {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
