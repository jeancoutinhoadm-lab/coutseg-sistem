import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";

const dashboardFilterSchema = z.object({
  period: z.enum(["month", "7days", "30days", "90days", "year"]).default("month"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  brokerId: z.string().optional(),
  insurerId: z.string().optional(),
});

export const getExecutiveDashboardData = createServerFn({ method: "GET" })
  .validator((data: unknown) => dashboardFilterSchema.parse(data))
  .handler(async ({ data }) => {
    const { period, startDate: customStart, endDate: customEnd, brokerId, insurerId } = data;

    // Date range calculation
    let start: Date;
    let end: Date = new Date();

    if (customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
    } else {
      switch (period) {
        case "7days":
          start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30days":
          start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90days":
          start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          start = new Date(new Date().getFullYear(), 0, 1);
          break;
        case "month":
        default:
          start = startOfMonth(new Date());
          end = endOfMonth(new Date());
          break;
      }
    }

    const startStr = start.toISOString();
    const endStr = end.toISOString();

    // Previous period for deltas
    const prevStart = subMonths(start, 1);
    const prevEnd = subMonths(end, 1);
    const prevStartStr = prevStart.toISOString();
    const prevEndStr = prevEnd.toISOString();

    // Helper for revenue calculation
    const getRevenue = async (s: string, e: string) => {
      let query = supabase
        .from("commission_receipts")
        .select("amount")
        .gte("receipt_date", s)
        .lte("receipt_date", e);
      
      if (insurerId) {
        const { data: commIds } = await supabase.from("commissions").select("id").eq("insurer_id" as any, insurerId);
        if (commIds?.length) {
          query = query.in("commission_id", commIds.map((c: { id: string }) => c.id));
        }
      }
      
      const { data: recs } = await query;
      return (recs || []).reduce((acc: number, curr: { amount: number }) => acc + (Number(curr.amount) || 0), 0);
    };

    // Helper for expense calculation
    const getExpenses = async (s: string, e: string) => {
      let query = supabase
        .from("financial_entries")
        .select("amount")
        .eq("type", "expense")
        .gte("entry_date", s)
        .lte("entry_date", e);
      
      const { data: entries } = await query;
      return (entries || []).reduce((acc: number, curr: { amount: number }) => acc + (Number(curr.amount) || 0), 0);
    };

    const [currentRevenue, prevRevenue, currentExpenses, prevExpenses] = await Promise.all([
      getRevenue(startStr, endStr).catch(() => 0),
      getRevenue(prevStartStr, prevEndStr).catch(() => 0),
      getExpenses(startStr, endStr).catch(() => 0),
      getExpenses(prevStartStr, prevEndStr).catch(() => 0),
    ]);

    // 3. Financeiro: A Receber / A Pagar
    const [receivablesRes, payablesRes] = await Promise.allSettled([
      supabase.from("commissions").select("expected_amount, received_amount, due_date").in("status", ["pending", "partial"]),
      supabase.from("payables").select("amount, due_date").in("status", ["pending", "partial"]),
    ]);

    const receivables = receivablesRes.status === 'fulfilled' ? (receivablesRes.value.data || []) : [];
    const payables = payablesRes.status === 'fulfilled' ? (payablesRes.value.data || []) : [];

    const todayStr = new Date().toISOString().split("T")[0];
    const overdueReceivables = (receivables || [])
      .filter((r: any) => r.due_date && todayStr && r.due_date < todayStr)
      .reduce((acc: number, curr: any) => acc + (Number(curr.expected_amount) - (Number(curr.received_amount) || 0)), 0);
    
    const totalReceivables = (receivables || [])
      .reduce((acc: number, curr: any) => acc + (Number(curr.expected_amount) - (Number(curr.received_amount) || 0)), 0);

    const overduePayables = (payables || [])
      .filter((p: any) => p.due_date && todayStr && p.due_date < todayStr)
      .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
    
    const totalPayables = (payables || []).reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

    // 4. Saldo em Contas
    const { data: accounts } = await supabase.from("bank_accounts").select("name, balance").eq("status", "active");
    const totalBalance = (accounts || []).reduce((acc: number, curr: any) => acc + (Number(curr.balance) || 0), 0);

    // 5. Operacional: IA e Pendências
    const [pendingIARes, needsReviewIARes, divergentCommsRes, overdueTasksRes] = await Promise.allSettled([
      supabase.from("document_processing").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
      supabase.from("document_processing").select("id", { count: "exact", head: true }).eq("status", "needs_review"),
      supabase.from("commissions").select("id", { count: "exact", head: true }).eq("status", "divergent"),
      supabase.from("tasks").select("id").neq("status", "COMPLETED").lt("due_date", todayStr)
    ]);

    const pendingIACount = pendingIARes.status === 'fulfilled' ? (pendingIARes.value.count || 0) : 0;
    const needsReviewIACount = needsReviewIARes.status === 'fulfilled' ? (needsReviewIARes.value.count || 0) : 0;
    const divergentCommsCount = divergentCommsRes.status === 'fulfilled' ? (divergentCommsRes.value.count || 0) : 0;
    const overdueTasks = overdueTasksRes.status === 'fulfilled' ? (overdueTasksRes.value.data || []) : [];

    const overdueTasksCount = overdueTasks?.length || 0;

    // 6. Carteira: Apólices e Renovações
    const getRenewalCount = async (days: number) => {
      const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const { count } = await supabase
        .from("policies")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .lte("end_date", d)
        .gte("end_date", todayStr);
      return count || 0;
    };

    const [ren7, ren15, ren30, ren60, ren90, policiesRes, clientsRes] = await Promise.all([
      getRenewalCount(7),
      getRenewalCount(15),
      getRenewalCount(30),
      getRenewalCount(60),
      getRenewalCount(90),
      supabase.from("policies").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

    const activePoliciesCount = policiesRes.data ? policiesRes.count : 0;
    const activeClientsCount = clientsRes.data ? clientsRes.count : 0;

    // 7. Comercial: Leads e Oportunidades
    const [leadsRes, oppsRes] = await Promise.allSettled([
      supabase.from("leads").select("status"),
      supabase.from("opportunities").select("status, priority, value_estimated, value_realized"),
    ]);

    const leads = leadsRes.status === 'fulfilled' ? (leadsRes.value.data || []) : [];
    const opportunities = oppsRes.status === 'fulfilled' ? (oppsRes.value.data || []) : [];

    const leadsByStatus: Record<string, number> = (leads || []).reduce((acc: Record<string, number>, curr: any) => {
      if (curr.status) acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    const oppsByStatus: Record<string, number> = (opportunities || []).reduce((acc: Record<string, number>, curr: any) => {
      if (curr.status) acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    const totalEstimatedValue = (opportunities || []).reduce((acc: number, curr: any) => acc + (Number(curr.value_estimated) || 0), 0);
    const totalRealizedValue = (opportunities || []).reduce((acc: number, curr: any) => acc + (Number(curr.value_realized) || 0), 0);
    const wonCount = oppsByStatus['won'] || 0;
    const lostCount = oppsByStatus['lost'] || 0;
    const conversionRate = (wonCount + lostCount) > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

    // 8. Ranking de Seguradoras
    const { data: insurerRankingData } = await supabase
      .from("commission_receipts")
      .select(`
        amount,
        commissions (
          insurers (
            name
          )
        )
      `)
      .gte("receipt_date", startStr)
      .lte("receipt_date", endStr);
    
    const ranking = (insurerRankingData || []).reduce((acc: Record<string, number>, curr: any) => {
      const name = curr.commissions?.insurers?.name || "Outros";
      acc[name] = (acc[name] || 0) + (Number(curr.amount) || 0);
      return acc;
    }, {});

    const sortedRanking = Object.entries(ranking)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Final normalization to ensure no undefined/null numbers reach the UI
    return {
      finance: {
        revenue: Number(currentRevenue) || 0,
        prevRevenue: Number(prevRevenue) || 0,
        expenses: Number(currentExpenses) || 0,
        prevExpenses: Number(prevExpenses) || 0,
        receivables: Number(totalReceivables) || 0,
        overdueReceivables: Number(overdueReceivables) || 0,
        payables: Number(totalPayables) || 0,
        overduePayables: Number(overduePayables) || 0,
        totalBalance: Number(totalBalance) || 0,
        bankAccounts: (accounts || []).map((a: any) => ({ 
          name: a.name || "Conta Sem Nome", 
          balance: Number(a.balance) || 0 
        })),
      },
      operation: {
        pendingIA: Number(pendingIACount || 0) + Number(needsReviewIACount || 0),
        needsReviewIA: Number(needsReviewIACount) || 0,
        divergentComms: Number(divergentCommsCount) || 0,
        overdueTasks: Number(overdueTasksCount) || 0,
      },
      portfolio: {
        activePolicies: Number(activePoliciesCount) || 0,
        activeClients: Number(activeClientsCount) || 0,
        renewals: {
          ren7: Number(ren7) || 0,
          ren15: Number(ren15) || 0,
          ren30: Number(ren30) || 0,
          ren60: Number(ren60) || 0,
          ren90: Number(ren90) || 0
        }
      },
      commercial: {
        opportunities: oppsByStatus || {},
        leads: leadsByStatus || {},
        totalEstimatedValue: Number(totalEstimatedValue) || 0,
        totalRealizedValue: Number(totalRealizedValue) || 0,
        conversionRate: Number(conversionRate) || 0,
        insurerRanking: sortedRanking || []
      }
    };
  });
