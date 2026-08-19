import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

const insightSchema = z.object({
  type: z.enum(['CROSS_SELL', 'RENEWAL_RISK', 'COMMERCIAL', 'FINANCIAL', 'COMMISSION', 'OPERATIONAL', 'DOCUMENT', 'PRODUCTIVITY', 'ANOMALY']),
  severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  title: z.string(),
  description: z.string(),
  evidence: z.any().optional(),
  suggested_action: z.string().optional(),
  entity_related: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  broker_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  ai_confidence: z.number().optional(),
  expires_at: z.string().optional(),
});

/**
 * MOTOR DE REGRAS DETERMINÍSTICAS
 * Roda no servidor para identificar insights óbvios antes de chamar LLM.
 */
export const runDeterministicInsights = createServerFn({ method: "POST" })
  .handler(async () => {
    const insights: z.infer<typeof insightSchema>[] = [];
    
    // 1. CROSS-SELL DETERMINÍSTICO (Ex: Auto sem Residencial)
    const { data: clients } = await supabase.from("clients").select("id, full_name");
    
    if (clients) {
      for (const client of clients) {
        const { data: policies } = await supabase
          .from("policies")
          .select("type")
          .eq("client_id", client.id)
          .not("status", "eq", "cancelled");

        const types = new Set(policies?.map(p => p.type.toLowerCase()) || []);
        
        if (types.has('auto') && !types.has('home')) {
          insights.push({
            type: 'CROSS_SELL',
            severity: 'LOW',
            title: `Cross-sell Residencial: ${client.full_name}`,
            description: "Cliente possui seguro Auto mas ainda não protege a residência.",
            suggested_action: "Oferecer combo Residencial na próxima interação.",
            entity_related: 'clients',
            entity_id: client.id,
          });
        }
      }
    }

    // 2. RISCO DE RENOVAÇÃO (Próxima em 30 dias sem atividade)
    const thirtyDaysFromNow = subDays(new Date(), -30).toISOString();
    const { data: upcomingRenewals } = await supabase
      .from("policies")
      .select("id, policy_number, client_id, clients(full_name), end_date")
      .lte("end_date", thirtyDaysFromNow)
      .gt("end_date", new Date().toISOString())
      .not("status", "eq", "cancelled");

    if (upcomingRenewals) {
      for (const policy of upcomingRenewals) {
        // Verificar oportunidades relacionadas à apólice (renovação é via oportunidade)
        const { data: relatedOpps } = await supabase
          .from("opportunities")
          .select("id, updated_at")
          .eq("original_policy_id", policy.id);

        let hasRecentActivity = false;
        
        if (relatedOpps && relatedOpps.length > 0) {
            for (const opp of relatedOpps) {
                const { data: activities } = await supabase
                  .from("crm_activities")
                  .select("id")
                  .eq("opportunity_id", opp.id)
                  .gte("created_at", subDays(new Date(), 15).toISOString());
                
                if (activities && activities.length > 0) hasRecentActivity = true;
            }
        }

        const { data: tasks } = await supabase
          .from("tasks")
          .select("id")
          .eq("policy_id", policy.id)
          .eq("status", "PENDING");

        if (!hasRecentActivity && (!tasks || tasks.length === 0)) {
          insights.push({
            type: 'RENEWAL_RISK',
            severity: 'HIGH',
            title: `Risco de Renovação: ${policy.policy_number}`,
            description: `Apólice de ${policy.clients?.full_name} vence em ${new Date(policy.end_date).toLocaleDateString()} e não há atividades recentes no CRM ou tarefas pendentes.`,
            suggested_action: "Criar tarefa urgente de renovação.",
            entity_related: 'policies',
            entity_id: policy.id,
          });
        }
      }
    }

    // 3. OPORTUNIDADES PARADAS
    const { data: staleOpps } = await supabase
      .from("opportunities")
      .select("id, notes, updated_at, products(name)")
      .eq("status", "open")
      .lte("updated_at", subDays(new Date(), 10).toISOString());

    if (staleOpps) {
      for (const opp of staleOpps) {
        insights.push({
          type: 'COMMERCIAL',
          severity: 'MEDIUM',
          title: `Oportunidade Parada: ${opp.products?.name || 'Sem Produto'}`,
          description: "Esta oportunidade não sofreu alterações nos últimos 10 dias.",
          suggested_action: "Revisar status e realizar follow-up.",
          entity_related: 'opportunities',
          entity_id: opp.id,
        });
      }
    }

    // Salvar insights ignorando duplicados (simplificado via UPSERT se houvesse chave única, mas usaremos loop por enquanto)
    if (insights.length > 0) {
      // Nota: Idealmente verificaríamos se o insight já existe e está NEW
      for (const insight of insights) {
        const { data: existing } = await supabase
            .from("business_insights")
            .select("id")
            .eq("entity_id", insight.entity_id!)
            .eq("type", insight.type)
            .eq("status", "NEW")
            .maybeSingle();
            
        if (!existing) {
            await supabase.from("business_insights").insert(insight as any);
        }
      }
    }

    return { count: insights.length };
  });
