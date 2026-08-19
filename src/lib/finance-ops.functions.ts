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
    const { data: payable } = await supabase
      .from("payables")
      .select("category_id, cost_center_id, description")
      .eq("id", data.payable_id)
      .single();

    if (!payable) throw new Error("Payable not found");

    const entryData: any = {
      type: "expense",
      amount: data.amount,
      entry_date: data.payment_date,
      bank_account_id: data.bank_account_id,
      category_id: payable.category_id,
      payable_id: data.payable_id,
    };
    
    if (payable.cost_center_id) entryData.cost_center_id = payable.cost_center_id;
    if (data.reference_number) entryData.reference_number = data.reference_number;
    if (data.notes) entryData.notes = data.notes;

    // 1. Criar lançamento financeiro (Fluxo de Caixa)
    const { error: entryError } = await supabase
      .from("financial_entries")
      .insert(entryData);

    if (entryError) throw entryError;

    // 2. Atualizar status do contas a pagar
    const { error: updateError } = await supabase
      .from("payables")
      .update({ status: "paid" as any })
      .eq("id", data.payable_id);

    if (updateError) throw updateError;

    // 3. Atualizar saldo da conta bancária
    const { data: account } = await supabase
      .from("bank_accounts")
      .select("balance")
      .eq("id", data.bank_account_id)
      .single();

    if (account) {
      await supabase
        .from("bank_accounts")
        .update({ balance: (account.balance || 0) - data.amount })
        .eq("id", data.bank_account_id);
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
