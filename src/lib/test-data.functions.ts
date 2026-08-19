import { supabase } from "@/integrations/supabase/client";

export const createPilotData = async () => {
  try {
    // 1. Criar Cliente Piloto
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .upsert({
        full_name: "Cliente Piloto Etapa 26",
        cpf_cnpj: "000.000.000-00",
        email: "piloto@coutseg.com.br",
        phone: "(11) 99999-9999",
        type: "INDIVIDUAL"
      }, { onConflict: 'cpf_cnpj' })
      .select()
      .single();

    if (clientErr) throw clientErr;

    // 2. Criar Lead Piloto
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        client_id: client.id,
        full_name: client.full_name,
        cpf_cnpj: client.cpf_cnpj,
        email: client.email,
        phone: client.phone,
        source: "outros",
        status: "new",
        notes: "Lead Piloto de Teste Operacional"
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
