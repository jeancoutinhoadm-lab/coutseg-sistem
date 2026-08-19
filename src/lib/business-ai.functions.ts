import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const askBusinessIASchema = z.object({
  question: z.string(),
});

/**
 * ASSISTENTE ANALÍTICO INTERNO (READ-ONLY)
 */
export const askBusinessIA = createServerFn({ method: "POST" })
  .validator((data: unknown) => askBusinessIASchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("Configuração de IA ausente.");

    // 1. Coletar contexto sanitizado
    const [finances, production, claims, crm] = await Promise.all([
      supabase.from("financial_entries").select("type, amount, entry_date").limit(100),
      supabase.from("policies").select("type, premium, insurer_id").limit(100),
      supabase.from("claims").select("status").limit(50),
      supabase.from("opportunities").select("status, value_estimated").limit(50),
    ]);

    const context = {
      finance_summary: finances.data?.reduce((acc: any, curr) => {
        const type = curr.type || 'unknown';
        acc[type] = (acc[type] || 0) + curr.amount;
        return acc;
      }, {}),
      production_count: production.data?.length,
      claims_status: claims.data?.reduce((acc: any, curr) => {
        const status = curr.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
      crm_active: crm.data?.filter(o => o.status === 'open').length,
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

    try {
      const response = await fetch('https://api.lovable.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: data.question },
          ],
          temperature: 0,
        }),
      });

      const result = await response.json();
      return { answer: result.choices[0].message.content };
    } catch (error) {
      console.error("Business IA Error:", error);
      throw new Error("Falha na análise da IA.");
    }
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
    return data || [];
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
