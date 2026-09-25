import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./server-security";

const channelSchema = z.enum(["web", "whatsapp", "telegram"]);
const questionSchema = z.object({ question: z.string().trim().min(2).max(500), channel: channelSchema.default("web") });
const clientInput = z.object({ clientId: z.string().uuid().optional(), query: z.string().trim().min(2).max(120).optional() });
const policyInput = z.object({ clientId: z.string().uuid().optional(), query: z.string().trim().min(2).max(120).optional(), days: z.number().int().min(1).max(90).default(30) });

export const assistantToolNames = [
  "search_client", "get_client_summary", "list_active_policies", "get_policy_summary",
  "list_upcoming_renewals", "get_client_contact", "list_client_products",
  "list_missing_cross_sell_products", "get_commission_summary", "list_pending_commissions",
] as const;
export type AssistantTool = (typeof assistantToolNames)[number];
export type AssistantRole = "admin" | "gerente" | "financeiro" | "administrativo" | "corretor";
export type AssistantGatewayContext = "web_session" | "trusted_external_delegation";

export function canUseAssistantTool(role: AssistantRole, tool: AssistantTool) {
  const commissions: AssistantTool[] = ["get_commission_summary", "list_pending_commissions"];
  const crossSell: AssistantTool[] = ["list_missing_cross_sell_products"];
  if (commissions.includes(tool)) return ["admin", "gerente", "financeiro"].includes(role);
  if (crossSell.includes(tool)) return role !== "financeiro";
  return true;
}

function maskDocument(value?: string | null) {
  const clean = value?.replace(/\D/g, "") ?? "";
  return clean.length < 4 ? null : `${"•".repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`;
}

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a consulta.";
}

async function ensureAssistantQuota(supabase: any, channel: string) {
  const { data, error } = await supabase.rpc("consume_assistant_request_quota" as any, { _channel: channel });
  if (error || data !== true) throw new Error("Limite de consultas atingido. Tente novamente em instantes.");
}

async function audit(supabase: any, userId: string, channel: string, intent: string | null, tool: string | null, outcome: string, duration: number) {
  await (supabase.from as any)("assistant_interaction_audit").insert({
    user_id: userId, channel, intent, tool_name: tool, outcome, duration_ms: Math.max(0, Math.round(duration)),
  });
}

async function findClient(supabase: any, input: z.infer<typeof clientInput>) {
  if (input.clientId) {
    const { data, error } = await supabase.from("clients").select("id, full_name, status, phone, whatsapp, email, cpf_cnpj").eq("id", input.clientId).maybeSingle();
    if (error || !data) throw new Error("Cliente não encontrado ou sem acesso.");
    return [data];
  }
  const { data, error } = await supabase.from("clients").select("id, full_name, status, phone, whatsapp, email, cpf_cnpj").ilike("full_name", `%${input.query}%`).limit(8);
  if (error) throw new Error("Não foi possível pesquisar clientes.");
  return data ?? [];
}

async function executeTool(supabase: any, userId: string, tool: AssistantTool, rawInput: unknown) {
  if (tool === "search_client") {
    const clients = await findClient(supabase, clientInput.parse(rawInput));
    return clients.map((client: any) => ({ id: client.id, name: client.full_name, status: client.status, document: maskDocument(client.cpf_cnpj) }));
  }
  if (tool === "get_client_contact") {
    const client = (await findClient(supabase, clientInput.parse(rawInput)))[0];
    if (!client) return { found: false };
    return { found: true, name: client.full_name, phone: client.whatsapp || client.phone || null, email: client.email || null };
  }
  if (tool === "get_client_summary" || tool === "list_client_products") {
    const client = (await findClient(supabase, clientInput.parse(rawInput)))[0];
    if (!client) return { found: false };
    const { data, error } = await supabase.from("policies").select("id, policy_number, status, type, end_date, premium, products(name)").eq("client_id", client.id).limit(30);
    if (error) throw new Error("Não foi possível consultar as apólices do cliente.");
    const policies = data ?? [];
    if (tool === "list_client_products") return { client: client.full_name, products: [...new Set(policies.map((p: any) => p.products?.name || p.type).filter(Boolean))] };
    return { client: client.full_name, status: client.status, activePolicies: policies.filter((p: any) => p.status === "active").length, policies: policies.map((p: any) => ({ number: p.policy_number, type: p.products?.name || p.type, status: p.status, endDate: p.end_date })) };
  }
  if (tool === "list_active_policies") {
    const input = policyInput.parse(rawInput);
    let query = supabase.from("policies").select("id, policy_number, status, type, end_date, premium, clients(full_name), products(name)").eq("status", "active").order("end_date").limit(30);
    const clientId = input.clientId ?? (input.query ? (await findClient(supabase, { query: input.query }))[0]?.id : undefined);
    if (input.query && !clientId) return [];
    if (clientId) query = query.eq("client_id", clientId);
    const { data, error } = await query;
    if (error) throw new Error("Não foi possível consultar apólices ativas.");
    return (data ?? []).map((p: any) => ({ id: p.id, number: p.policy_number, client: p.clients?.full_name, type: p.products?.name || p.type, endDate: p.end_date, premium: p.premium }));
  }
  if (tool === "get_policy_summary") {
    const input = z.object({ policyId: z.string().uuid() }).parse(rawInput);
    const { data, error } = await supabase.from("policies").select("id, policy_number, status, type, start_date, end_date, renewal_date, premium, coverage_amount, clients(full_name), insurers(name), products(name)").eq("id", input.policyId).maybeSingle();
    if (error || !data) throw new Error("Apólice não encontrada ou sem acesso.");
    return { number: data.policy_number, client: (data as any).clients?.full_name, insurer: (data as any).insurers?.name, product: (data as any).products?.name || data.type, status: data.status, startDate: data.start_date, endDate: data.end_date, renewalDate: data.renewal_date, premium: data.premium, coverageAmount: data.coverage_amount };
  }
  if (tool === "list_upcoming_renewals") {
    const { days } = policyInput.parse(rawInput);
    const today = new Date(); const until = new Date(today); until.setDate(today.getDate() + days);
    const { data, error } = await supabase.from("policies").select("id, policy_number, end_date, renewal_date, clients(full_name), products(name)").eq("status", "active").gte("end_date", today.toISOString().slice(0, 10)).lte("end_date", until.toISOString().slice(0, 10)).order("end_date").limit(50);
    if (error) throw new Error("Não foi possível consultar renovações.");
    return (data ?? []).map((p: any) => ({ id: p.id, number: p.policy_number, client: p.clients?.full_name, product: p.products?.name, endDate: p.end_date, renewalDate: p.renewal_date }));
  }
  if (tool === "list_missing_cross_sell_products") {
    await requireAnyRole(supabase, userId, ["admin", "gerente", "administrativo", "corretor"]);
    const client = (await findClient(supabase, clientInput.parse(rawInput)))[0]; if (!client) return { found: false };
    const { data: policies } = await supabase.from("policies").select("product_id, products(name)").eq("client_id", client.id).eq("status", "active");
    const owned = new Set((policies ?? []).map((p: any) => p.product_id));
    const { data: rules } = await supabase.from("cross_sell_rules").select("source_product_id, target_product_id, target:products!cross_sell_rules_target_product_id_fkey(name)").eq("active", true).in("source_product_id", [...owned]);
    return { client: client.full_name, missingProducts: (rules ?? []).filter((r: any) => !owned.has(r.target_product_id)).map((r: any) => r.target?.name).filter(Boolean) };
  }
  await requireAnyRole(supabase, userId, ["admin", "gerente", "financeiro"]);
  if (tool === "get_commission_summary") {
    const { data, error } = await supabase.from("commissions").select("expected_amount, received_amount, status, due_date").limit(500);
    if (error) throw new Error("Não foi possível consultar comissões.");
    return (data ?? []).reduce((acc: any, c: any) => ({ expected: acc.expected + Number(c.expected_amount || 0), received: acc.received + Number(c.received_amount || 0), pending: acc.pending + (c.status === "pending" || c.status === "expected" ? 1 : 0) }), { expected: 0, received: 0, pending: 0 });
  }
  if (tool === "list_pending_commissions") {
    const { data, error } = await supabase.from("commissions").select("id, expected_amount, received_amount, due_date, status, policies(policy_number, clients(full_name))").in("status", ["pending", "expected", "partial", "divergent"]).order("due_date").limit(50);
    if (error) throw new Error("Não foi possível consultar comissões pendentes.");
    return (data ?? []).map((c: any) => ({ id: c.id, policy: c.policies?.policy_number, client: c.policies?.clients?.full_name, expected: c.expected_amount, received: c.received_amount, dueDate: c.due_date, status: c.status }));
  }
  throw new Error("Tool não permitida.");
}

export function intentFromQuestion(question: string): { intent: string; tool: AssistantTool; input: unknown } | null {
  const q = question.toLocaleLowerCase("pt-BR");
  if (/comiss/.test(q) && /(pendente|pendentes|aberta|abertas)/.test(q)) return { intent: "pending_commissions", tool: "list_pending_commissions", input: {} };
  if (/comiss/.test(q) && /(quanto|resumo|recebemos|recebido)/.test(q)) return { intent: "commission_summary", tool: "get_commission_summary", input: {} };
  if (/(venc|renova)/.test(q)) { const days = Number(q.match(/(\d{1,2})\s*dias?/)?.[1] ?? 30); return { intent: "upcoming_renewals", tool: "list_upcoming_renewals", input: { days } }; }
  if (/(telefone|celular|whatsapp|contato)/.test(q)) return { intent: "client_contact", tool: "get_client_contact", input: { query: question.replace(/.*?(telefone|celular|whatsapp|contato)(\s+do|\s+da|\s+de)?/i, "").trim() } };
  if (/(auto|automóvel)/.test(q) && /(residencial|casa|home)/.test(q)) return { intent: "cross_sell", tool: "list_missing_cross_sell_products", input: { query: question.replace(/.*?(cliente|clientes)/i, "").trim() } };
  if (/apólice|apolice/.test(q)) {
    const clientQuery = question.replace(/.*?cliente\s+/i, "").replace(/\s+(possui|tem|ativas?|quais|são).*$/i, "").trim();
    return { intent: "active_policies", tool: "list_active_policies", input: clientQuery.length >= 2 && /cliente/i.test(question) ? { query: clientQuery } : {} };
  }
  if (/cliente/.test(q)) return { intent: "search_client", tool: "search_client", input: { query: question.replace(/.*?cliente(s)?/i, "").trim() } };
  return null;
}

function formatAnswer(tool: AssistantTool, result: any) {
  if (tool === "list_active_policies" || tool === "list_upcoming_renewals" || tool === "list_pending_commissions") return result.length ? `${tool === "list_active_policies" ? `${result.length} apólice(s) encontrada(s).\n` : ""}${result.map((item: any) => `• ${item.client ?? ""} ${item.number ?? item.policy ?? ""} — ${item.endDate ?? item.dueDate ?? item.status}`).join("\n")}` : "Nenhum registro encontrado com as permissões atuais.";
  if (tool === "search_client") return result.length ? result.map((c: any) => `• ${c.name} (${c.status ?? "sem status"})`).join("\n") : "Nenhum cliente encontrado com as permissões atuais.";
  if (tool === "get_client_contact") return result.found ? `${result.name}: ${result.phone ?? "telefone não cadastrado"}${result.email ? ` · ${result.email}` : ""}` : "Cliente não encontrado com as permissões atuais.";
  if (tool === "get_commission_summary") return `Comissões esperadas: R$ ${result.expected.toFixed(2)}\nRecebidas: R$ ${result.received.toFixed(2)}\nPendentes: ${result.pending}`;
  return JSON.stringify(result);
}

// The external path is intentionally a fixed RPC allowlist. It never receives
// a table name, SQL, role, or caller-provided user id.
async function delegatedRpc(supabase: any, name: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name as never, args);
  if (error) throw new Error("Consulta não autorizada ou indisponível.");
  return data;
}

async function delegatedClientId(supabase: any, userId: string, rawInput: unknown) {
  const input = clientInput.parse(rawInput);
  if (input.clientId) return input.clientId;
  const clients = await delegatedRpc(supabase, "assistant_search_client", { _delegated_user_id: userId, _query: input.query });
  return clients?.[0]?.id as string | undefined;
}

export async function executeTrustedExternalDelegation(supabase: any, delegatedUserId: string, tool: AssistantTool, rawInput: unknown) {
  if (!assistantToolNames.includes(tool)) throw new Error("Tool não permitida.");
  if (tool === "search_client") return delegatedRpc(supabase, "assistant_search_client", { _delegated_user_id: delegatedUserId, _query: clientInput.parse(rawInput).query });
  if (tool === "get_commission_summary") return delegatedRpc(supabase, "assistant_get_commission_summary", { _delegated_user_id: delegatedUserId });
  if (tool === "list_pending_commissions") return delegatedRpc(supabase, "assistant_list_pending_commissions", { _delegated_user_id: delegatedUserId });
  if (tool === "list_upcoming_renewals") return delegatedRpc(supabase, "assistant_list_upcoming_renewals", { _delegated_user_id: delegatedUserId, _days: policyInput.parse(rawInput).days });
  if (tool === "list_active_policies") {
    const input = policyInput.parse(rawInput);
    const clientId = input.clientId ?? (input.query ? await delegatedClientId(supabase, delegatedUserId, { query: input.query }) : undefined);
    return delegatedRpc(supabase, "assistant_list_active_policies", { _delegated_user_id: delegatedUserId, _client_id: clientId ?? null });
  }
  if (tool === "get_policy_summary") return delegatedRpc(supabase, "assistant_get_policy_summary", { _delegated_user_id: delegatedUserId, _policy_id: z.object({ policyId: z.string().uuid() }).parse(rawInput).policyId });
  const clientId = await delegatedClientId(supabase, delegatedUserId, rawInput);
  if (!clientId) return { found: false };
  const names: Record<Exclude<AssistantTool, "search_client" | "get_commission_summary" | "list_pending_commissions" | "list_upcoming_renewals" | "list_active_policies" | "get_policy_summary">, string> = {
    get_client_summary: "assistant_get_client_summary", get_client_contact: "assistant_get_client_contact",
    list_client_products: "assistant_list_client_products", list_missing_cross_sell_products: "assistant_list_missing_cross_sell_products",
  };
  return delegatedRpc(supabase, names[tool], { _delegated_user_id: delegatedUserId, _client_id: clientId });
}

export async function runTrustedExternalAssistant(supabase: any, delegatedUserId: string, question: string) {
  const plan = intentFromQuestion(question);
  if (!plan) return { tool: null, answer: "Posso ajudar com clientes, apólices, renovações e comissões." };
  const result = await executeTrustedExternalDelegation(supabase, delegatedUserId, plan.tool, plan.input);
  return { tool: plan.tool, answer: formatAnswer(plan.tool, result) };
}

export const askAssistantGateway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => questionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const started = performance.now(); let plan: ReturnType<typeof intentFromQuestion> = null;
    try {
      await requireAnyRole(context.supabase, context.userId, ["admin", "gerente", "financeiro", "administrativo", "corretor"]);
      await ensureAssistantQuota(context.supabase, data.channel);
      plan = intentFromQuestion(data.question);
      if (!plan) {
        await audit(context.supabase, context.userId, data.channel, "unsupported", null, "invalid_request", performance.now() - started);
        return { answer: "Posso ajudar com clientes, apólices, renovações e comissões. Faça uma pergunta objetiva, sem enviar credenciais ou documentos.", tool: null };
      }
      const result = await executeTool(context.supabase, context.userId, plan.tool, plan.input);
      await audit(context.supabase, context.userId, data.channel, plan.intent, plan.tool, "success", performance.now() - started);
      return { answer: formatAnswer(plan.tool, result), tool: plan.tool };
    } catch (error) {
      await audit(context.supabase, context.userId, data.channel, plan?.intent ?? "error", plan?.tool ?? null, "denied", performance.now() - started);
      throw new Error(asErrorMessage(error));
    }
  });
