import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subMonths, startOfMonth, endOfMonth, format } from "date-fns";

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

    // 1. Financeiro: Receita (Commission Receipts)
    const getRevenue = async (s: string, e: string) => {
      let query = supabase
        .from("commission_receipts")
        .select("amount")
        .gte("receipt_date", s)
        .lte("receipt_date", e);
      
      if (insurerId) {
        const { data: commIds } = await supabase.from("commissions").select("id").eq("insurer_id" as any, insurerId);
        if (commIds?.length) query = query.in("commission_id", commIds.map((c: { id: string }) => c.id));
      }
      
      const { data: recs } = await query;
      return (recs || []).reduce((acc: number, curr: { amount: number }) => acc + (Number(curr.amount) || 0), 0);
    };

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
      getRevenue(startStr, endStr),
      getRevenue(prevStartStr, prevEndStr),
      getExpenses(startStr, endStr),
      getExpenses(prevStartStr, prevEndStr),
    ]);

    const [{ data: receivables }, { data: payables }] = await Promise.all([
      supabase.from("commissions").select("expected_amount, received_amount, due_date").in("status", ["pending", "partial"]),
      supabase.from("payables").select("amount, due_date").in("status", ["pending", "partial"]),
    ]);

    const todayStr = new Date().toISOString().split("T")[0];
    const overdueReceivables = (receivables || [])
      .filter((r: { due_date: string | null }) => r.due_date && todayStr && r.due_date < todayStr)
      .reduce((acc: number, curr: { expected_amount: number; received_amount: number | null }) => acc + (Number(curr.expected_amount) - (Number(curr.received_amount) || 0)), 0);
    
    const totalReceivables = (receivables || [])
      .reduce((acc: number, curr: { expected_amount: number; received_amount: number | null }) => acc + (Number(curr.expected_amount) - (Number(curr.received_amount) || 0)), 0);

    const overduePayables = (payables || [])
      .filter((p: { due_date: string | null }) => p.due_date && todayStr && p.due_date < todayStr)
      .reduce((acc: number, curr: { amount: number }) => acc + Number(curr.amount), 0);
    
    const totalPayables = (payables || []).reduce((acc: number, curr: { amount: number }) => acc + Number(curr.amount), 0);

    const { data: accounts } = await supabase.from("bank_accounts").select("name, balance").eq("status", "active");
    const totalBalance = (accounts || []).reduce((acc: number, curr: { balance: number | null }) => acc + (Number(curr.balance) || 0), 0);


    // 5. Operacional: IA e Pendências
    const [{ count: pendingIA }, { count: needsReviewIA }, { count: divergentComms }] = await Promise.all([
      supabase.from("document_processing").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
      supabase.from("document_processing").select("id", { count: "exact", head: true }).eq("status", "needs_review"),
      supabase.from("commissions").select("id", { count: "exact", head: true }).eq("status", "divergent"),
    ]);

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


    const [ren7, ren15, ren30, ren60, ren90, { count: activePolicies }, { count: activeClients }] = await Promise.all([
      getRenewalCount(7),
      getRenewalCount(15),
      getRenewalCount(30),
      getRenewalCount(60),
      getRenewalCount(90),
      supabase.from("policies").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

    // 7. Comercial: Oportunidades
    const { data: opportunities } = await supabase.from("opportunities").select("status, priority");
    const oppsByStatus = (opportunities || []).reduce((acc: Record<string, number>, curr) => {
      if (curr.status) {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const crossSellCount = (opportunities || []).filter((o: { status: string | null }) => o.status === 'cross_sell' as any).length;

    // 8. Ranking de Seguradoras
    const { data: insurerRanking } = await supabase
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
    
    const ranking = (insurerRanking || []).reduce((acc: Record<string, number>, curr: any) => {
      const name = curr.commissions?.insurers?.name || "Outros";
      acc[name] = (acc[name] || 0) + (Number(curr.amount) || 0);
      return acc;
    }, {} as Record<string, number>);

    const sortedRanking = Object.entries(ranking)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);


    return {
      finance: {
        revenue: currentRevenue,
        prevRevenue,
        expenses: currentExpenses,
        prevExpenses,
        receivables: totalReceivables,
        overdueReceivables,
        payables: totalPayables,
        overduePayables,
        totalBalance,
        bankAccounts: accounts || [],
      },
      operation: {
        pendingIA: (pendingIA || 0) + (needsReviewIA || 0),
        needsReviewIA: needsReviewIA || 0,
        divergentComms: divergentComms || 0,
      },
      portfolio: {
        activePolicies: activePolicies || 0,
        activeClients: activeClients || 0,
        renewals: {
          ren7, ren15, ren30, ren60, ren90
        }
      },
      commercial: {
        opportunities: oppsByStatus,
        crossSellCount,
        insurerRanking: sortedRanking
      }
    };
  });
