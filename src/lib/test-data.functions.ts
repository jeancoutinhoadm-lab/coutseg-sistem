import { supabase } from "@/integrations/supabase/client";

export const createPilotData = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // 1. Garantir Seguradora e Produto Mestre
    const { data: insurer } = await supabase
      .from("insurers")
      .upsert({ name: "PORTO SEGURO (PILOTO)", active: true }, { onConflict: 'name' })
      .select().single();

    const { data: product } = await supabase
      .from("products")
      .upsert({ name: "AUTOMÓVEL (PILOTO)", category: "AUTO", active: true }, { onConflict: 'name' })
      .select().single();

    const { data: category } = await supabase
      .from("financial_categories")
      .upsert({ name: "COMISSÃO (PILOTO)", type: "income" }, { onConflict: 'name' })
      .select().single();

    const { data: account } = await supabase
      .from("bank_accounts")
      .upsert({ name: "CONTA CORRENTE (PILOTO)", balance: 0, status: "active" }, { onConflict: 'name' })
      .select().single();

    // 2. Criar Cliente Piloto
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .upsert({
        full_name: "Cliente Piloto Etapa 26.1",
        cpf_cnpj: "000.000.000-01",
        email: "piloto1@coutseg.com.br",
        phone: "(11) 99999-9999",
        type: "INDIVIDUAL",
        status: "active"
      }, { onConflict: 'cpf_cnpj' })
      .select()
      .single();

    if (clientErr) throw clientErr;

    // 3. Criar Lead Piloto
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
        notes: "Lead Piloto de Teste CRM"
      })
      .select()
      .single();

    if (leadErr) throw leadErr;

    // 4. Criar Oportunidade e Cotação
    const { data: opportunity } = await supabase
      .from("opportunities")
      .insert({
        client_id: client.id,
        lead_id: lead.id,
        product_id: product?.id,
        status: "new",
        priority: "normal"
      })
      .select().single();

    const { data: quote } = await supabase
      .from("quotes")
      .insert({
        opportunity_id: opportunity?.id,
        insurer_id: insurer?.id,
        premium: 2500.00,
        commission_percentage: 15,
        status: "pending"
      })
      .select().single();

    // 5. Criar Apólice e Renovação Próxima
    const { data: policy } = await supabase
      .from("policies")
      .insert({
        client_id: client.id,
        insurer_id: insurer?.id,
        product_id: product?.id,
        policy_number: "PILOTO-2026-001",
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 dias pra frente
        premium: 2500.00,
        status: "active"
      })
      .select().single();

    // 6. Financeiro: Receita e Despesa
    await supabase.from("financial_entries").insert([
      {
        type: "income",
        amount: 1000.00,
        entry_date: new Date().toISOString().split('T')[0],
        category_id: category?.id,
        bank_account_id: account?.id,
        user_id: user.id,
        notes: "RECEITA PILOTO"
      },
      {
        type: "expense",
        amount: 200.00,
        entry_date: new Date().toISOString().split('T')[0],
        category_id: category?.id, // Simplificado usando a mesma categoria
        bank_account_id: account?.id,
        user_id: user.id,
        notes: "DESPESA PILOTO"
      }
    ]);

    // 7. Tarefas
    await supabase.from("tasks").insert([
      {
        title: "Revisar Documento Piloto",
        status: "PENDING",
        priority: "HIGH",
        user_id: user.id,
        policy_id: policy?.id
      },
      {
        title: "Confirmar Renovação Piloto",
        status: "PENDING",
        priority: "MEDIUM",
        user_id: user.id,
        policy_id: policy?.id
      }
    ]);

    return { success: true, clientId: client.id };
  } catch (error) {
    console.error("Erro ao criar dados piloto completo:", error);
    throw error;
  }
};
