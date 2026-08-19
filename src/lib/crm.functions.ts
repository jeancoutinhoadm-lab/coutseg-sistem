import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const leadConversionSchema = z.object({
  leadId: z.string().uuid(),
  brokerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

export const convertLeadToOpportunity = createServerFn({ method: "POST" })
  .validator((data: unknown) => leadConversionSchema.parse(data))
  .handler(async ({ data }) => {
    const { leadId, brokerId, productId } = data;

    // 1. Get Lead data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) throw new Error("Lead não encontrado");
    if (lead.status === 'converted') throw new Error("Lead já convertido");

    // 2. Check if client already exists (CPF/CNPJ check)
    let clientId = lead.client_id;
    
    if (!clientId && lead.cpf_cnpj) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("cpf_cnpj", lead.cpf_cnpj)
        .maybeSingle();
      
      if (existingClient) {
        clientId = existingClient.id;
      }
    }

    // 3. Create Client if not exists
    if (!clientId) {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          full_name: lead.full_name,
          email: lead.email,
          phone: lead.phone,
          cpf_cnpj: lead.cpf_cnpj,
          broker_id: brokerId || lead.broker_id,
          status: "active"
        })
        .select("id")
        .single();
      
      if (clientError) throw clientError;
      clientId = newClient.id;
    }

    // 4. Create Opportunity
    const { data: opportunity, error: oppError } = await supabase
      .from("opportunities")
      .insert({
        client_id: clientId,
        lead_id: leadId,
        broker_id: brokerId || lead.broker_id,
        product_id: productId,
        status: "new",
        priority: "normal",
      })
      .select("id")
      .single();

    if (oppError) throw oppError;

    // 5. Update Lead status
    const { error: updateError } = await supabase
      .from("leads")
      .update({ 
        status: "converted", 
        client_id: clientId,
        updated_at: new Date().toISOString()
      } as any)
      .eq("id", leadId);

    if (updateError) throw updateError;

    // 6. Record Activity
    await supabase.from("crm_activities").insert({
      lead_id: leadId,
      opportunity_id: opportunity.id,
      type: "conversion",
      description: `Lead convertido em cliente (ID: ${clientId}) e oportunidade criada.`,
    });

    return { opportunityId: opportunity.id, clientId };
  });

const opportunityLossSchema = z.object({
  opportunityId: z.string().uuid(),
  reason: z.string().min(1),
  notes: z.string().optional(),
});

export const markOpportunityAsLost = createServerFn({ method: "POST" })
  .validator((data: unknown) => opportunityLossSchema.parse(data))
  .handler(async ({ data }) => {
    const { opportunityId, reason, notes } = data;

    const { error } = await supabase
      .from("opportunities")
      .update({ 
        status: "lost",
        loss_reason: reason,
        notes: notes ? `Motivo da perda: ${reason}. Obs: ${notes}` : `Motivo da perda: ${reason}`,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
      .eq("id", opportunityId);

    if (error) throw error;

    await supabase.from("crm_activities").insert({
      opportunity_id: opportunityId,
      type: "loss",
      description: `Oportunidade marcada como PERDIDA. Motivo: ${reason}`,
    });

    return { success: true };
  });
