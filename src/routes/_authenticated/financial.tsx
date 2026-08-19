import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Receipt, 
  History,
  TrendingUp
} from "lucide-react";
import { getFinancialSummary } from "@/lib/finance.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/financial")({
  component: FinancialDashboard,
});

function FinancialDashboard() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["financial-summary"],
    queryFn: () => getFinancialSummary(),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Financeiro</h1>
          <p className="text-muted-foreground">Visão geral do caixa e contas da CoutSeg.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link to="/commissions">Comissões</Link>
          </Button>
          <Button asChild>
            <Link to="/central-entrada">Novo Documento</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Saldo em Contas</CardTitle>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : formatCurrency(summary?.totalBalance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Disponível em bancos e caixa</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Contas a Receber</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : formatCurrency(summary?.totalReceivables || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Comissões e outras receitas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Contas a Pagar</CardTitle>
            <ArrowDownRight className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : formatCurrency(summary?.totalPayables || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Despesas pendentes de pagamento</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/financial" className="transition-transform hover:scale-105">
           <Card className="cursor-pointer hover:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Fluxo de Caixa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">DRE e movimentações reais</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/financial" className="transition-transform hover:scale-105">
          <Card className="cursor-pointer hover:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">Gestão de contas a pagar</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/commissions" className="transition-transform hover:scale-105">
          <Card className="cursor-pointer hover:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Receitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">Comissões e recebíveis</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/financial" className="transition-transform hover:scale-105">
          <Card className="cursor-pointer hover:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="w-4 h-4" />
                Extrato Bancário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">Conciliação de contas</div>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      {/* Aqui virão os componentes de lista e gráficos em sub-rotas ou abas */}
    </div>
  );
}
