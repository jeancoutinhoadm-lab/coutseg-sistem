# Plano Etapa 18 — Dashboard Gerencial Executivo

Implementar um dashboard executivo de alta densidade informativa e precisão, focado em "Como está a CoutSeg hoje?".

## 1. Backend e Lógica de Dados
- Criar `src/lib/dashboard.functions.ts` contendo `getExecutiveDashboardData`.
- Implementar consultas agregadas para:
  - **Financeiro:** Receitas (Comissões pagas), Despesas (Payables pagos), Fluxo de Caixa, Contas a Receber/Pagar (pendentes), Saldos Bancários.
  - **Operacional:** Status de `document_processing` (IA), Comissões Divergentes.
  - **Comercial:** Oportunidades por status/prioridade, Cross-sell.
  - **Carteira:** Clientes ativos, Apólices ativas, Renovações (7, 15, 30, 60, 90 dias).
- Adicionar filtros de data e RBAC no servidor.

## 2. Interface (UI)
- Refatorar `src/routes/_authenticated/index.tsx`.
- Estruturar em seções:
  - **Filtros Globais:** Seletor de período e filtros rápidos.
  - **Alertas e Pendências:** Seção prioritária com documentos para revisar, renovações críticas e contas vencidas.
  - **Visão Financeira:** Cards de Receita, Despesa, Resultado e Saldos.
  - **Gráficos de Fluxo:** Tendência de Entradas vs Saídas.
  - **Pipeline Comercial:** Oportunidades e Ranking de Seguradoras.
- Implementar "Drill-down": indicadores clicáveis que levam às rotas filtradas.

## 3. Segurança e Performance
- Garantir que usuários com role `corretor` vejam apenas seus dados via RLS.
- Otimizar queries para evitar N+1.
- Validar tratamento de "Zero Dados" e "Erros de Consulta".

## 4. Verificação
- Testar fluxos de variação mensal.
- Validar que transferências bancárias não afetam o saldo consolidado (via categoria/tipo).
- Executar `build` e `typecheck`.
