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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      
      if (!response.ok) {
        const status = response.status;
        let errorText = "";
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = "Não foi possível ler o corpo da resposta de erro.";
        }

        console.error(`Business IA Gateway Error [${status}]:`, {
          contentType,
          isCloudflareError: errorText.includes("1016") || errorText.includes("Origin DNS Error"),
        });

        if (status >= 500 || errorText.includes("1016") || errorText.includes("Origin DNS Error")) {
          throw new Error("O serviço de Inteligência Artificial está temporariamente indisponível. Tente novamente em alguns instantes.");
        }
        
        throw new Error("Falha na comunicação com a IA.");
      }

      if (!contentType.includes("application/json")) {
        console.error("Business IA Error: Resposta não é JSON", { contentType });
        throw new Error("O serviço de IA retornou um formato inesperado.");
      }

      const result = await response.json();
      
      if (!result?.choices?.[0]?.message?.content) {
        console.error("Business IA Error: Estrutura JSON inválida", result);
        throw new Error("Resposta da IA com formato inválido.");
      }

      return { answer: result.choices[0].message.content };
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error("Business IA Error: Timeout (15s)");
        throw new Error("A IA demorou muito para responder. Tente novamente.");
      }

      console.error("Business IA Error:", error.message || error);
      
      // Se já for um erro com mensagem amigável, repassa
      if (error.message && (
        error.message.includes("temporariamente indisponível") || 
        error.message.includes("demorou muito") ||
        error.message.includes("formato inesperado")
      )) {
        throw error;
      }

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
