import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const payableSchema = z.object({
  description: z.string(),
  amount: z.number(),
  due_date: z.string(),
  competence_date: z.string(),
  category_id: z.string(),
  cost_center_id: z.string().optional(),
  notes: z.string().optional(),
  document_id: z.string().optional(),
});

export const createPayable = createServerFn({ method: "POST" })
  .validator((data: unknown) => payableSchema.parse(data))
  .handler(async ({ data }) => {
    const insertData: any = {
      description: data.description,
      amount: data.amount,
      due_date: data.due_date,
      competence_date: data.competence_date,
      category_id: data.category_id,
      status: "pending",
    };
    
    if (data.cost_center_id) insertData.cost_center_id = data.cost_center_id;
    if (data.notes) insertData.notes = data.notes;
    if (data.document_id) insertData.document_id = data.document_id;

    const { data: payable, error } = await supabase
      .from("payables")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return payable;
  });

export const recordPayment = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    payable_id: z.string(),
    bank_account_id: z.string(),
    amount: z.number(),
    payment_date: z.string(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    // 1. Verificar duplicidade (Idempotência/Prevenção de pagamento duplicado)
    const { data: existingEntry } = await supabase
      .from("financial_entries")
      .select("id")
      .eq("payable_id", data.payable_id)
      .eq("type", "expense")
      .maybeSingle();

    if (existingEntry) {
      throw new Error("Esta despesa já possui um pagamento registrado.");
    }

    const { data: payable } = await supabase
      .from("payables")
      .select("category_id, cost_center_id, description, status, amount")
      .eq("id", data.payable_id)
      .single();

    if (!payable) throw new Error("Conta a pagar não encontrada");
    if (payable.status === 'paid') throw new Error("Esta conta já está marcada como paga.");

    // 2. Lógica de Pagamento Parcial vs Total
    const isPartial = data.amount < payable.amount;
    const newStatus = isPartial ? "partial" : "paid";

    const entryData: any = {
      type: "expense",
      amount: data.amount,
      entry_date: data.payment_date,
      bank_account_id: data.bank_account_id,
      category_id: payable.category_id,
      payable_id: data.payable_id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    };
    
    if (payable.cost_center_id) entryData.cost_center_id = payable.cost_center_id;
    if (data.reference_number) entryData.reference_number = data.reference_number;
    if (data.notes) entryData.notes = data.notes;

    // 3. Executar transação atômica (emulada por sequência de chamadas com verificação)
    const { error: entryError } = await supabase
      .from("financial_entries")
      .insert(entryData);

    if (entryError) throw entryError;

    const { error: updateError } = await supabase
      .from("payables")
      .update({ status: newStatus as any })
      .eq("id", data.payable_id);

    if (updateError) throw updateError;

    const { data: account } = await supabase
      .from("bank_accounts")
      .select("balance")
      .eq("id", data.bank_account_id)
      .single();

    if (account) {
      await supabase
        .from("bank_accounts")
        .update({ balance: (Number(account.balance) || 0) - data.amount })
        .eq("id", data.bank_account_id);
    }

    return { success: true, status: newStatus };
  });

export const reverseEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    entry_id: z.string(),
    reason: z.string(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { data: entry } = await supabase
      .from("financial_entries")
      .select("*")
      .eq("id", data.entry_id)
      .single();

    if (!entry) throw new Error("Lançamento não encontrado");

    // Estorno: Criar lançamento de sinal oposto
    const reversalData: any = {
      type: 'adjustment',
      amount: -Number(entry.amount),
      entry_date: new Date().toISOString().split('T')[0],
      bank_account_id: entry.bank_account_id,
      category_id: entry.category_id,
      notes: `ESTORNO: ${data.reason} (Ref: ${entry.id})`,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    };

    if (entry.payable_id) reversalData.payable_id = entry.payable_id;
    if (entry.cost_center_id) reversalData.cost_center_id = entry.cost_center_id;

    const { error: reversalError } = await supabase
      .from("financial_entries")
      .insert(reversalData);

    if (reversalError) throw reversalError;

    // Se for despesa vinculada a payable, voltar status
    if (entry.payable_id) {
      await supabase
        .from("payables")
        .update({ status: "pending" as any })
        .eq("id", entry.payable_id);
    }

    // Atualizar saldo bancário
    const { data: account } = await supabase
      .from("bank_accounts")
      .select("balance")
      .eq("id", entry.bank_account_id!)
      .single();

    if (account) {
      const entryAmount = Number(entry.amount);
      const currentBalance = Number(account.balance) || 0;
      const multiplier = entry.type === 'income' ? -1 : 1;
      
      await supabase
        .from("bank_accounts")
        .update({ balance: currentBalance + (entryAmount * multiplier) })
        .eq("id", entry.bank_account_id!);
    }

    return { success: true };
  });

export const getFinancialCategories = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabase
      .from("financial_categories")
      .select("*")
      .order("name");
    return data || [];
  });

export const getBankAccounts = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabase
      .from("bank_accounts")
      .select("*")
      .order("name");
    return data || [];
  });
