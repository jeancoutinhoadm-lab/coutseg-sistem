import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { callGemini } from "./gemini.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota, requireAnyRole } from "./server-security";

const askBusinessIASchema = z.object({
  question: z.string().trim().min(1).max(1_000),
});

/**
 * ASSISTENTE ANALÍTICO INTERNO (READ-ONLY)
 */
/**
 * LÓGICA CORE DA IA (READ-ONLY)
 */
export async function processBusinessIA(data: { question: string }, authenticatedSupabase = supabase) {
  // 1. Coletar contexto sanitizado
  const [finances, production, claims, crm] = await Promise.all([
    authenticatedSupabase.from("financial_entries").select("type, amount, entry_date").limit(100),
    authenticatedSupabase.from("policies").select("type, premium, insurer_id").limit(100),
    authenticatedSupabase.from("claims").select("status, deleted_at").limit(50),
    authenticatedSupabase.from("opportunities").select("status, value_estimated").limit(50),
  ]);

  const context = {
    finance_summary: finances.data?.reduce((acc: any, curr) => {
      const type = curr.type || 'unknown';
      acc[type] = (acc[type] || 0) + curr.amount;
      return acc;
    }, {}),
    production_count: production.data?.length,
    claims_status: claims.data?.filter((curr) => !(curr as { deleted_at?: string | null }).deleted_at).reduce((acc: any, curr) => {
      const status = curr.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {}),
    crm_active: crm.data?.filter(o => ["new", "contacted", "quoting", "negotiating", "deferred"].includes(o.status || "")).length,
  };

  // 2. Chamar LLM com restrições severas
  const systemPrompt = `Você é o Assistente Analítico da CoutSeg. 
  Seu objetivo é analisar dados, encontrar padrões e sugerir ações.
  REGRAS CRÍTICAS:
  1. Você é READ-ONLY. Nunca sugira que você pode alterar dados diretamente.
  2. Use APENAS o contexto fornecido abaixo. Se não souber, diga "Não há dados suficientes".
  3. Responda em Português do Brasil de forma executiva e direta.
  4. Não invente PII (CPF, CNPJ) ou nomes de clientes.
  5. Se identificar anomalias, use termos como "Padrão incomum detectado".
  
  CONTEXTO COUTSEG:
  ${JSON.stringify(context, null, 2)}`;

  const result = await callGemini({
    systemInstruction: systemPrompt,
    prompt: data.question,
    temperature: 0,
  });
  return { answer: result.text };
}

/**
 * ASSISTENTE ANALÍTICO INTERNO (READ-ONLY)
 */
export const askBusinessIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => askBusinessIASchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "gerente"]);
    await consumeAiQuota(context.supabase);
    return processBusinessIA(data, context.supabase);
  });

/**
 * BUSCAR INSIGHTS ATIVOS
 */
export const getActiveInsights = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase
      .from("business_insights")
      .select("*")
      .eq("status", "NEW")
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as any[];
  });

/**
 * DAR FEEDBACK AO INSIGHT
 */
export const feedbackInsight = createServerFn({ method: "POST" })
  .validator((data: unknown) => 
    z.object({ 
      id: z.string().uuid(), 
      useful: z.boolean() 
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from("business_insights")
      .update({ feedback_useful: data.useful, status: 'REVIEWED' } as any)
      .eq("id", data.id);

    if (error) throw error;
    return { success: true };
  });
