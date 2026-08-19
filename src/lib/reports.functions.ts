import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, differenceInDays } from "date-fns";

const reportsFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  brokerId: z.string().optional(),
  insurerId: z.string().optional(),
  categoryId: z.string().optional(),
  bankAccountId: z.string().optional(),
  productId: z.string().optional(),
});

/**
 * RELATÓRIO FINANCEIRO (Caixa)
 */
export const getFinancialReport = createServerFn({ method: "GET" })
  .validator((data: unknown) => reportsFilterSchema.parse(data))
  .handler(async ({ data }) => {
    const { startDate, endDate, categoryId, bankAccountId } = data;

    let query = supabase
      .from("financial_entries")
      .select(`
        *,
        bank_accounts(name),
        financial_categories(name)
      `)
      .order("entry_date", { ascending: true });

    if (startDate) query = query.gte("entry_date", startDate);
    if (endDate) query = query.lte("entry_date", endDate);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (bankAccountId) query = query.eq("bank_account_id", bankAccountId);

    const { data: entries, error } = await query;
    if (error) throw error;

    const summary = (entries || []).reduce(
      (acc, curr) => {
        const amt = Number(curr.amount) || 0;
        if (curr.type === "income") {
          acc.revenue += amt;
        } else if (curr.type === "expense") {
          acc.expenses += amt;
        }
        return acc;
      },
      { revenue: 0, expenses: 0 }
    );

    return {
      entries: entries || [],
      summary: {
        ...summary,
        result: summary.revenue - summary.expenses,
      },
    };
  });

/**
 * RELATÓRIO DE COMPETÊNCIA
 */
export const getAccrualReport = createServerFn({ method: "GET" })
  .validator((data: unknown) => reportsFilterSchema.parse(data))
  .handler(async ({ data }) => {
    const { startDate, endDate } = data;
    
    // Receitas por competência (Comissões)
    let commQuery = supabase
      .from("commissions")
      .select("expected_amount, status")
      .not("status", "eq", "cancelled");
    
    if (startDate) commQuery = commQuery.gte("due_date", startDate);
    if (endDate) commQuery = commQuery.lte("due_date", endDate);

    // Despesas por competência (Contas a Pagar)
    let payQuery = supabase
      .from("payables")
      .select("amount, status")
      .not("status", "eq", "cancelled");

    if (startDate) payQuery = payQuery.gte("due_date", startDate);
    if (endDate) payQuery = payQuery.lte("due_date", endDate);

    const [comms, pays] = await Promise.all([commQuery, payQuery]);

    const revenue = (comms.data || []).reduce((acc, curr) => acc + (Number(curr.expected_amount) || 0), 0);
    const expenses = (pays.data || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return {
      revenue,
      expenses,
      result: revenue - expenses,
      period: { startDate, endDate }
    };
  });

/**
 * RELATÓRIO DE COMISSÕES E CONCILIAÇÃO
 */
export const getCommissionReport = createServerFn({ method: "GET" })
  .validator((data: unknown) => reportsFilterSchema.parse(data))
  .handler(async ({ data }) => {
    const { startDate, endDate, insurerId } = data;

    let query = supabase
      .from("commissions")
      .select(`
        *,
        commission_receipts(*)
      `)
      .order("due_date", { ascending: false });

    if (startDate) query = query.gte("due_date", startDate);
    if (endDate) query = query.lte("due_date", endDate);
    if (insurerId) {
      const { data: policies } = await supabase.from("policies").select("id").eq("insurer_id", insurerId);
      if (policies?.length) {
        query = query.in("policy_id", policies.map(p => p.id));
      } else {
        query = query.eq("policy_id", "00000000-0000-0000-0000-000000000000"); // Empty result
      }
    }

    const { data: commissions, error } = await query;
    if (error) throw error;

    return commissions || [];
  });

/**
 * RELATÓRIO DE PRODUÇÃO (Seguradoras / Produtos)
 */
export const getProductionReport = createServerFn({ method: "GET" })
  .validator((data: unknown) => reportsFilterSchema.parse(data))
  .handler(async ({ data }) => {
    const { startDate, endDate } = data;

    // Produção por Seguradora
    const { data: insurerData } = await supabase
      .from("policies")
      .select(`
        id,
        insurer_id,
        insurers(name),
        premium,
        commissions(expected_amount)
      `)
      .is("deleted_at", null);

    // Produção por Produto
    const { data: productData } = await supabase
      .from("policies")
      .select(`
        id,
        product_id,
        products(name),
        premium,
        commissions(expected_amount)
      `)
      .is("deleted_at", null);

    return {
      byInsurer: insurerData || [],
      byProduct: productData || []
    };
  });

/**
 * RELATÓRIO COMERCIAL (CRM)
 */
export const getCRMReport = createServerFn({ method: "GET" })
  .validator((data: unknown) => reportsFilterSchema.parse(data))
  .handler(async ({ data }) => {
    const { startDate, endDate, brokerId } = data;

    const [leads, opps] = await Promise.all([
      supabase.from("leads").select("*"),
      supabase.from("opportunities").select("*, products(name), clients(full_name)")
    ]);

    return {
      leads: leads.data || [],
      opportunities: opps.data || []
    };
  });

/**
 * RELATÓRIO DE PRODUTIVIDADE
 */
export const getProductivityReport = createServerFn({ method: "GET" })
  .validator((data: unknown) => reportsFilterSchema.parse(data))
  .handler(async ({ data }) => {
    const { startDate, endDate, brokerId } = data;

    let query = supabase
      .from("tasks")
      .select(`
        *
      `);

    if (brokerId) query = query.eq("user_id", brokerId);

    const { data: tasks, error } = await query;
    if (error) throw error;

    return tasks || [];
  });

/**
 * RELATÓRIO DE PROCESSAMENTO IA
 */
export const getIAReport = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: docs } = await supabase
      .from("document_processing")
      .select("*");
    
    return docs || [];
  });

/**
 * RELATÓRIO DE AUDITORIA
 */
export const getAuditReport = createServerFn({ method: "GET" })
  .validator((data: unknown) => reportsFilterSchema.parse(data))
  .handler(async ({ data }) => {
    const { startDate, endDate } = data;

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate);

    const { data: logs, error } = await query;
    if (error) throw error;

    return logs || [];
  });
