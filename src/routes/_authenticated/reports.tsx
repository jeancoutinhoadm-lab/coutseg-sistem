import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  FileText, 
  DollarSign, 
  Users, 
  Briefcase,
  History,
  Activity,
  ArrowRight,
  Filter,
  Download,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

// Este é um componente de navegação para os relatórios
export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsCentral,
  head: () => ({
    meta: [
      { title: "Central de Relatórios - Coutseg" },
      { name: "description", content: "Inteligência operacional e relatórios gerenciais detalhados." },
    ],
  }),
});

function ReportsCentral() {
  const { hasRole } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>("finance");

  const categories = [
    { id: "finance", label: "Financeiro", icon: DollarSign, roles: ["admin", "financeiro", "gerente"] },
    { id: "commercial", label: "Comercial", icon: TrendingUp, roles: ["admin", "gerente", "corretor"] },
    { id: "portfolio", label: "Carteira", icon: Users, roles: ["admin", "gerente", "administrativo"] },
    { id: "operational", label: "Operacional", icon: Activity, roles: ["admin", "gerente", "administrativo"] },
    { id: "audit", label: "Auditoria", icon: ShieldCheck, roles: ["admin"] },
  ];

  const reports = {
    finance: [
      { title: "Resultado Financeiro", desc: "DRE Simplificado: Receitas, Despesas e Resultado Líquido.", icon: BarChart3 },
      { title: "Fluxo de Caixa", desc: "Movimentações reais por data de entrada e saída.", icon: Activity },
      { title: "Resultado por Competência", desc: "Análise por data de direito/obrigação (Due Date).", icon: Calendar },
      { title: "Contas a Receber", desc: "Status de comissões e recebíveis por cliente.", icon: FileCheck },
      { title: "Contas a Pagar", desc: "Despesas internas e obrigações futuras.", icon: Layers },
      { title: "Comissões e Conciliação", desc: "Divergências entre esperado vs recebido.", icon: AlertTriangle },
    ],
    commercial: [
      { title: "Pipeline CRM", desc: "Conversão de Leads para Oportunidades e Vendas.", icon: TrendingUp },
      { title: "Produção por Seguradora", desc: "Volume de vendas e comissões por parceiro.", icon: Briefcase },
      { title: "Produção por Produto", desc: "Desempenho de vendas por ramo de seguro.", icon: PackageIcon },
      { title: "Motivos de Perda", desc: "Análise de gargalos no funil comercial.", icon: XCircleIcon },
    ],
    portfolio: [
      { title: "Carteira de Clientes", desc: "Perfil da base ativa e novos ingressos.", icon: Users },
      { title: "Relatório de Renovações", desc: "Status do ciclo de vida das apólices.", icon: CalendarClockIcon },
      { title: "Taxa de Retenção", desc: "Renovações elegíveis vs efetivadas.", icon: Activity },
      { title: "Visão Multiproduto", desc: "Oportunidades de cross-sell na base.", icon: Layers },
    ],
    operational: [
      { title: "Produtividade da Equipe", desc: "Controle de tarefas, prazos e conclusões.", icon: CheckCircle2 },
      { title: "Processamento IA", desc: "Status e eficiência da extração de documentos.", icon: FileText },
    ],
    audit: [
      { title: "Eventos Críticos", desc: "Log detalhado de alterações sensíveis.", icon: History },
      { title: "Fechamentos Mensais", desc: "Histórico de períodos encerrados.", icon: ShieldCheck },
    ]
  };

  const allowedCategories = categories.filter(c => hasRole(c.roles));

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios Gerenciais</h1>
        <p className="text-muted-foreground">Inteligência baseada em dados reais para gestão estratégica.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 space-y-2">
          {allowedCategories.map((cat) => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveCategory(cat.id)}
            >
              <cat.icon className="mr-2 h-4 w-4" />
              {cat.label}
            </Button>
          ))}
        </aside>

        <main className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports[activeCategory as keyof typeof reports]?.map((report, idx) => (
              <Card key={idx} className="hover:shadow-md transition-all cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <report.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription className="text-xs">{report.desc}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="mt-4 flex items-center text-xs font-semibold text-primary">
                    Abrir Relatório <ArrowRight className="ml-1 h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

// Mock components for icons that might be missing from direct lucide-react import
function PackageIcon(props: any) { return <Briefcase {...props} /> }
function XCircleIcon(props: any) { return <AlertTriangle {...props} /> }
function CalendarClockIcon(props: any) { return <Calendar {...props} /> }
