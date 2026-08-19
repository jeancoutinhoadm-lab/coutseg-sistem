import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const getFinancialSummary = createServerFn({ method: "GET" })
  .handler(async () => {
    // 1. Saldo em Contas (Bancos)
    const { data: accounts } = await supabase
      .from("bank_accounts")
      .select("balance")
      .eq("status", "active");
    
    const totalBalance = (accounts || []).reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);

    // 2. Contas a Receber (Comissões pendentes e parciais)
    // Usamos o módulo de comissões existente conforme instrução
    const { data: commissions } = await supabase
      .from("commissions")
      .select("expected_amount, received_amount")
      .in("status", ["pending", "partial"]);
    
    const totalReceivables = (commissions || []).reduce((acc, curr) => {
      const expected = Number(curr.expected_amount) || 0;
      const received = Number(curr.received_amount) || 0;
      return acc + (expected - received);
    }, 0);

    // 3. Contas a Pagar (Despesas internas pendentes e parciais)
    const { data: payables } = await supabase
      .from("payables")
      .select("amount")
      .in("status", ["pending", "partial"]);
    
    const totalPayables = (payables || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return {
      totalBalance,
      totalReceivables,
      totalPayables,
    };
  });

export const getFinancialPeriods = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabase
      .from("financial_periods")
      .select("*")
      .order("period_month", { ascending: false });
    return data || [];
  });

export const closeFinancialPeriod = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    period_month: z.string(),
  }).parse(data))
  .handler(async ({ data }) => {
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase
      .from("financial_periods")
      .upsert({
        period_month: data.period_month,
        status: "closed",
        closed_at: new Date().toISOString(),
        closed_by: user?.id,
      });

    if (error) throw error;
    return { success: true };
  });

export const getFinancialEntries = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    let query = supabase
      .from("financial_entries")
      .select(`
        *,
        bank_accounts(name),
        financial_categories(name)
      `)
      .order("entry_date", { ascending: false });

    if (data.startDate) query = query.gte("entry_date", data.startDate);
    if (data.endDate) query = query.lte("entry_date", data.endDate);

    const { data: entries, error } = await query;
    if (error) throw error;
    return entries;
  });
