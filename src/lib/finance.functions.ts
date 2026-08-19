import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const getFinancialSummary = createServerFn({ method: "GET" })
  .handler(async () => {
    // Buscar saldos das contas
    const { data: accounts } = await supabase
      .from("bank_accounts")
      .select("balance")
      .eq("status", "active");

    const totalBalance = accounts?.reduce((acc, curr) => acc + (curr.balance || 0), 0) || 0;

    // Buscar contas a pagar pendentes
    const { data: payables } = await supabase
      .from("payables")
      .select("amount")
      .eq("status", "pending");

    const totalPayables = payables?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

    // Buscar comissões a receber (pendentes/parciais)
    const { data: commissions } = await supabase
      .from("commissions")
      .select("expected_amount, received_amount")
      .in("status", ["pending", "partial"]);

    const totalReceivables = commissions?.reduce((acc, curr) => acc + (curr.expected_amount - (curr.received_amount || 0)), 0) || 0;

    return {
      totalBalance,
      totalPayables,
      totalReceivables,
    };
  });
