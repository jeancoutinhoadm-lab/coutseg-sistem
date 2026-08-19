import { supabase } from "@/integrations/supabase/client";

export const createPilotData = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // 1. Garantir Seguradora e Produto Mestre
    const { data: insurer } = await supabase
      .from("insurers")
      .upsert({ name: "PORTO SEGURO (PILOTO)", active: true } as any, { onConflict: 'name' })
      .select().single();

    const { data: product } = await supabase
      .from("products")
      .upsert({ name: "AUTOMÓVEL (PILOTO)", category: "AUTO", active: true } as any, { onConflict: 'name' })
      .select().single();

    const { data: category } = await supabase
      .from("financial_categories")
      .upsert({ name: "COMISSÃO (PILOTO)", type: "income" } as any, { onConflict: 'name' })
      .select().single();

    const { data: account } = await supabase
      .from("bank_accounts")
      .upsert({ name: "CONTA CORRENTE (PILOTO)", status: "active" } as any, { onConflict: 'name' })
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
      } as any, { onConflict: 'cpf_cnpj' })
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
      } as any)
      .select()
      .single();

    if (leadErr) throw leadErr;

    // 4. Criar Oportunidade e Cotação
    const { data: opportunity } = await supabase
      .from("opportunities")
      .insert({
        client_id: client.id,
        lead_id: lead.id,
        product_id: product?.id || null,
        status: "new",
        priority: "normal"
      } as any)
      .select().single();

    const { data: quote } = await supabase
      .from("quotes")
      .insert({
        opportunity_id: opportunity?.id || null,
        insurer_id: insurer?.id || null,
        premium: 2500.00,
        status: "pending"
      } as any)
      .select().single();

    // 5. Criar Apólice e Renovação Próxima
    const { data: policy } = await supabase
      .from("policies")
      .insert({
        client_id: client.id,
        insurer_id: insurer?.id || null,
        product_id: product?.id || null,
        policy_number: "PILOTO-2026-001",
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 dias pra frente
        premium: 2500.00,
        status: "active"
      } as any)
      .select().single();

    // 6. Financeiro: Receita e Despesa
    await supabase.from("financial_entries").insert([
      {
        type: "income",
        amount: 1000.00,
        entry_date: new Date().toISOString().split('T')[0],
        category_id: category?.id || null,
        bank_account_id: account?.id || null,
        user_id: user.id,
        notes: "RECEITA PILOTO"
      } as any,
      {
        type: "expense",
        amount: 200.00,
        entry_date: new Date().toISOString().split('T')[0],
        category_id: category?.id || null, 
        bank_account_id: account?.id || null,
        user_id: user.id,
        notes: "DESPESA PILOTO"
      } as any
    ]);

    // 7. Tarefas
    await supabase.from("tasks").insert([
      {
        title: "Revisar Documento Piloto",
        status: "PENDING",
        priority: "HIGH",
        user_id: user.id,
        policy_id: policy?.id || null
      } as any,
      {
        title: "Confirmar Renovação Piloto",
        status: "PENDING",
        priority: "MEDIUM",
        user_id: user.id,
        policy_id: policy?.id || null
      } as any
    ]);

    return { success: true, clientId: client.id };
  } catch (error) {
    console.error("Erro ao criar dados piloto completo:", error);
    throw error;
  }
};
