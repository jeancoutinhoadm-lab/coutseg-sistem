import { supabase } from "@/integrations/supabase/client";

export const createPilotData = async () => {
  try {
    // 1. Criar Cliente Piloto
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .upsert({
        name: "Cliente Piloto Etapa 26",
        document_number: "000.000.000-00",
        email: "piloto@coutseg.com.br",
        phone: "(11) 99999-9999",
        type: "INDIVIDUAL"
      }, { onConflict: 'document_number' })
      .select()
      .single();

    if (clientErr) throw clientErr;

    // 2. Criar Lead/Oportunidade Piloto
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        client_id: client.id,
        source: "OUTRO",
        status: "NEW",
        description: "Lead Piloto de Teste Operacional"
      })
      .select()
      .single();

    if (leadErr) throw leadErr;

    return { client, lead };
  } catch (error) {
    console.error("Erro ao criar dados piloto:", error);
    throw error;
  }
};
