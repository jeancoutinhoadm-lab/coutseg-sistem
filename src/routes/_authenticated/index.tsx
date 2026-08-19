import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp,
  DollarSign,
  Clock,
  AlertCircle,
  ArrowRight,
  Inbox,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ShieldCheck,
  Calendar,
  Briefcase,
  Target,
  FileSearch,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";
import { getExecutiveDashboardData } from "@/lib/dashboard.functions";
import { useState } from "react";
import { cn } from "@/lib/utils";

import { runDeterministicInsights } from "@/lib/business-rules.functions";
import { getActiveInsights, feedbackInsight, askBusinessIA } from "@/lib/business-ai.functions";
import { toast } from "sonner";
import { 
  Sparkles, 
  ThumbsUp, 
  ThumbsDown, 
  Bot, 
  MessageSquare, 
  Send,
  Zap
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
  loader: async () => {
    // Executar insights determinísticos ao carregar o dashboard
    await runDeterministicInsights();
    return {};
  },
  head: () => ({
    meta: [
      { title: "Dashboard Gerencial - Coutseg" },
      { name: "description", content: "Visão Executiva da Coutseg" },
    ],
  }),
});

function DashboardPage() {
  const { role } = useAuth();
  const [period, setPeriod] = useState<"month" | "7days" | "30days" | "90days" | "year">("month");

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["executive-dashboard", period],
    queryFn: () => getExecutiveDashboardData({ data: { period } }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Erro ao carregar dashboard</h2>
        <p className="text-muted-foreground">Não foi possível carregar os indicadores reais.</p>
        <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
      </div>
    );
  }

  const { finance, operation, portfolio, commercial } = stats;

  const result = finance.revenue - finance.expenses;
  const revenueDelta = finance.prevRevenue > 0 ? ((finance.revenue - finance.prevRevenue) / finance.prevRevenue) * 100 : 0;
  const expenseDelta = finance.prevExpenses > 0 ? ((finance.expenses - finance.prevExpenses) / finance.prevExpenses) * 100 : 0;

  return (
    <div className="space-y-8 pb-10">
      {/* Inteligência da CoutSeg */}
      <BusinessIntelligence />

      {/* Header & Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DASHBOARD GERENCIAL</h1>
          <p className="text-muted-foreground">Como está a CoutSeg hoje?</p>
        </div>
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg self-start">
          {(["7days", "30days", "month", "90days", "year"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPeriod(p)}
              className={cn("text-xs capitalize", period === p && "bg-background shadow-sm")}
            >
              {p === "7days" ? "7 Dias" : p === "30days" ? "30 Dias" : p === "month" ? "Mês" : p === "90days" ? "90 Dias" : "Ano"}
            </Button>
          ))}
        </div>
      </div>

      {/* Alertas e Operação */}
      <div className="grid gap-6 md:grid-cols-3">
        <Link to="/renewals" className="block">
          <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-all cursor-pointer group h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold tracking-widest text-red-600">CRÍTICO: RENOVAÇÕES</CardTitle>
              <Calendar className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{portfolio.renewals.ren7}</div>
              <p className="text-xs text-muted-foreground mt-1">Próximos 7 dias</p>
              <div className="mt-4 flex items-center text-xs font-medium text-red-600">
                Ver Central <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/central-entrada" className="block">
          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-all cursor-pointer group h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold tracking-widest text-amber-600">IA: CONFERÊNCIA</CardTitle>
              <FileSearch className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{operation.pendingIA}</div>
              <p className="text-xs text-muted-foreground mt-1">Aguardando revisão humana</p>
              <div className="mt-4 flex items-center text-xs font-medium text-amber-600">
                Processar Agora <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/commissions" className="block">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-all cursor-pointer group h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold tracking-widest text-blue-600">FINANCEIRO: DIVERGÊNCIA</CardTitle>
              <AlertCircle className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{operation.divergentComms}</div>
              <p className="text-xs text-muted-foreground mt-1">Conciliações divergentes</p>
              <div className="mt-4 flex items-center text-xs font-medium text-blue-600">
                Auditar <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/tasks" className="block">
          <Card className={cn(
            "border-l-4 hover:shadow-md transition-all cursor-pointer group h-full",
            (operation as any).overdueTasks > 0 ? "border-l-red-600 bg-red-50/10" : "border-l-indigo-500"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={cn(
                "text-sm font-bold tracking-widest",
                (operation as any).overdueTasks > 0 ? "text-red-700" : "text-indigo-600"
              )}>
                EQUIPE: PRODUTIVIDADE
              </CardTitle>
              <Clock className={cn(
                "h-5 w-5 group-hover:scale-110 transition-transform",
                (operation as any).overdueTasks > 0 ? "text-red-600" : "text-indigo-500"
              )} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(operation as any).overdueTasks || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Tarefas atrasadas hoje</p>
              <div className={cn(
                "mt-4 flex items-center text-xs font-medium",
                (operation as any).overdueTasks > 0 ? "text-red-700" : "text-indigo-600"
              )}>
                Ver Gestão <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>


      {/* Financeiro Executivo */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Receita (Caixa)
            </CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(finance.revenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs">
              {revenueDelta >= 0 ? (
                <span className="text-green-600 flex items-center"><ArrowUpRight className="h-3 w-3 mr-1" />+{revenueDelta.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 flex items-center"><ArrowDownRight className="h-3 w-3 mr-1" />{revenueDelta.toFixed(1)}%</span>
              )}
              <span className="ml-1 text-muted-foreground">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Despesa (Caixa)
            </CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(finance.expenses)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs">
              {expenseDelta <= 0 ? (
                <span className="text-green-600 flex items-center"><ArrowDownRight className="h-3 w-3 mr-1" />{expenseDelta.toFixed(1)}%</span>
              ) : (
                <span className="text-red-600 flex items-center"><ArrowUpRight className="h-3 w-3 mr-1" />+{expenseDelta.toFixed(1)}%</span>
              )}
              <span className="ml-1 text-muted-foreground">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-4 w-4" /> Resultado Líquido
            </CardDescription>
            <CardTitle className={cn("text-2xl", result >= 0 ? "text-green-600" : "text-red-600")}>
              {formatCurrency(result)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Competência {format(new Date(), 'MMMM', { locale: ptBR })}</div>
          </CardContent>
        </Card>

        <Card className="bg-accent/50 border-accent">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Saldo Consolidado
            </CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(finance.totalBalance)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">{finance.bankAccounts.length} contas ativas</div>
          </CardContent>
        </Card>
      </div>

      {/* A Receber / A Pagar Drill-down */}
      <div className="grid gap-6 md:grid-cols-2">
        <Link to="/financial" search={{ type: 'receivable' } as any} className="block group">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Contas a Receber</CardTitle>
              <Badge variant={finance.overdueReceivables > 0 ? "destructive" : "outline"}>
                {finance.overdueReceivables > 0 ? `${formatCurrency(finance.overdueReceivables)} VENCIDO` : "EM DIA"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{formatCurrency(finance.receivables)}</span>
                <span className="text-sm text-muted-foreground">total pendente</span>
              </div>
              <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${Math.min(100, (finance.revenue / ((finance.revenue + finance.receivables) || 1)) * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                <span>Recebido</span>
                <span>Pendente</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/financial" search={{ type: 'payable' } as any} className="block group">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Contas a Pagar</CardTitle>
              <Badge variant={finance.overduePayables > 0 ? "destructive" : "outline"}>
                {finance.overduePayables > 0 ? `${formatCurrency(finance.overduePayables)} VENCIDO` : "EM DIA"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{formatCurrency(finance.payables)}</span>
                <span className="text-sm text-muted-foreground">total pendente</span>
              </div>
              <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500" 
                  style={{ width: `${Math.min(100, (finance.expenses / ((finance.expenses + finance.payables) || 1)) * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                <span>Pago</span>
                <span>Pendente</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>


      {/* Pipeline e Ranking */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" /> Pipeline Comercial
            </CardTitle>
            <CardDescription>Oportunidades ativas por status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border bg-card">
                <div className="text-xs text-muted-foreground uppercase font-bold">Leads (Novos)</div>
                <div className="text-2xl font-bold">{commercial.leads['new'] || 0}</div>
              </div>
              <div className="p-4 rounded-xl border bg-card">
                <div className="text-xs text-muted-foreground uppercase font-bold">Oportunidades</div>
                <div className="text-2xl font-bold">{Object.values(commercial.opportunities).reduce((a, b) => a + b, 0)}</div>
              </div>
              <div className="p-4 rounded-xl border bg-card">
                <div className="text-xs text-muted-foreground uppercase font-bold">Taxa Conv.</div>
                <div className="text-2xl font-bold">{commercial.conversionRate.toFixed(1)}%</div>
              </div>

              <div className="p-4 rounded-xl border bg-primary/10 border-primary/20">
                <div className="text-xs text-primary uppercase font-bold flex items-center gap-1">
                  <Target className="h-3 w-3" /> Valor Est.
                </div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(commercial.totalEstimatedValue)}</div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-6" asChild>
              <Link to="/opportunities">Ver Funil de Vendas</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ranking Seguradoras</CardTitle>
            <CardDescription>Por comissão recebida</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {commercial.insurerRanking.length > 0 ? commercial.insurerRanking.map((item, idx) => (
              <div key={item.name} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium truncate max-w-[150px]">{idx + 1}. {item.name}</span>
                  <span className="font-bold">{formatCurrency(item.value)}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${commercial.insurerRanking[0] ? (item.value / commercial.insurerRanking[0].value) * 100 : 0}%` }}
                  />
                </div>
              </div>

            )) : (
              <p className="text-center text-sm text-muted-foreground py-10">Sem movimentações no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Carteira e Renovações Futuras */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Visão de Carteira e Renovações</CardTitle>
              <CardDescription>Resumo de renovações futuras nos próximos 90 dias</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{portfolio.activePolicies}</div>
              <div className="text-xs text-muted-foreground uppercase font-bold">Apólices Ativas</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "7 Dias", value: portfolio.renewals.ren7, color: "text-red-600" },
              { label: "15 Dias", value: portfolio.renewals.ren15, color: "text-red-500" },
              { label: "30 Dias", value: portfolio.renewals.ren30, color: "text-amber-600" },
              { label: "60 Dias", value: portfolio.renewals.ren60, color: "text-blue-600" },
              { label: "90 Dias", value: portfolio.renewals.ren90, color: "text-slate-600" },
            ].map((r) => (
              <Link 
                key={r.label}
                to="/renewals" 
                className="p-4 rounded-xl border bg-card hover:bg-accent transition-colors text-center"
              >
                <div className="text-xs text-muted-foreground uppercase font-bold">{r.label}</div>
                <div className={cn("text-3xl font-black mt-1", r.color)}>{r.value}</div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatCurrency(value?: number) {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { 
    style: "currency", 
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function BusinessIntelligence() {
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [chat, setChat] = useState<{q: string, a: string}[]>([]);

  const { data: insights, isLoading: loadingInsights, refetch } = useQuery({
    queryKey: ["business-insights"],
    queryFn: () => getActiveInsights(),
  });

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setIsAsking(true);
    try {
      const { answer } = await askBusinessIA({ data: { question } });
      setChat(prev => [...prev, { q: question, a: answer }]);
      setQuestion("");
    } catch (err) {
      toast.error("Erro ao consultar IA");
    } finally {
      setIsAsking(false);
    }
  };

  const handleFeedback = async (id: string, useful: boolean) => {
    try {
      await feedbackInsight({ data: { id, useful } });
      toast.success("Feedback registrado");
      refetch();
    } catch (err) {
      toast.error("Erro ao salvar feedback");
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Feed de Insights */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Inteligência da CoutSeg
          </CardTitle>
          <CardDescription>Insights automáticos e detecção de anomalias</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
          {loadingInsights ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : insights?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Nenhum insight novo detectado. Tudo sob controle!
            </div>
          ) : (
            insights?.map((insight: any) => (
              <div key={insight.id} className="p-3 rounded-lg bg-background border shadow-sm space-y-2 group">
                <div className="flex justify-between items-start">
                  <Badge variant={insight.severity === 'CRITICAL' || insight.severity === 'HIGH' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {insight.type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(insight.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-sm">{insight.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                {insight.suggested_action && (
                  <div className="bg-primary/10 p-2 rounded text-[11px] border border-primary/20">
                    <span className="font-bold text-primary">Sugestão: </span>
                    {insight.suggested_action}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleFeedback(insight.id, true)}>
                    <ThumbsUp className="h-3 w-3 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleFeedback(insight.id, false)}>
                    <ThumbsDown className="h-3 w-3 text-red-600" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Chat Analítico */}
      <Card className="flex flex-col border-indigo-200 bg-indigo-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-600" />
            Assistente Analítico
          </CardTitle>
          <CardDescription>Pergunte sobre seus indicadores (Somente Leitura)</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-4 min-h-[300px]">
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[250px] p-2">
            {chat.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 opacity-60">
                <MessageSquare className="h-8 w-8 text-indigo-300" />
                <p className="text-xs text-indigo-900">
                  "Por que minha receita caiu este mês?"<br/>
                  "Quais oportunidades estão paradas?"
                </p>
              </div>
            )}
            {chat.map((msg, i) => (
              <div key={i} className="space-y-2">
                <div className="bg-indigo-600 text-white p-2 rounded-lg rounded-tr-none ml-8 text-xs self-end">
                  {msg.q}
                </div>
                <div className="bg-white border p-2 rounded-lg rounded-tl-none mr-8 text-xs flex gap-2">
                  <Zap className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                  <div className="whitespace-pre-wrap">{msg.a}</div>
                </div>
              </div>
            ))}
            {isAsking && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 animate-pulse">
                <Bot className="h-4 w-4" />
                Analisando dados reais...
              </div>
            )}
          </div>
          
          <form onSubmit={handleAsk} className="flex gap-2 mt-auto pt-4 border-t border-indigo-100">
            <input 
              type="text"
              placeholder="Sua pergunta..."
              className="flex-1 bg-white border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isAsking}
            />
            <Button type="submit" size="icon" disabled={isAsking || !question.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
