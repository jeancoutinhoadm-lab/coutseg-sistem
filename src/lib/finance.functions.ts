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
