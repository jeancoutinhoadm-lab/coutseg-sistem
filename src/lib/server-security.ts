import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

type AuthenticatedSupabase = SupabaseClient<Database>;

export async function requireAnyRole(
  supabase: AuthenticatedSupabase,
  userId: string,
  allowedRoles: readonly AppRole[],
) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", [...allowedRoles]);

  if (error) throw new Error("Não foi possível validar as permissões do usuário.");
  if (!data?.length) throw new Error("Acesso não autorizado para esta operação.");
}

export async function requireDocumentAccess(
  supabase: AuthenticatedSupabase,
  documentId: string,
) {
  const { data, error } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) throw new Error("Documento não encontrado ou sem permissão de acesso.");
}

export async function consumeAiQuota(supabase: AuthenticatedSupabase) {
  const { data, error } = await (supabase.rpc as any)("consume_ai_request_quota");
  if (error || data !== true) {
    throw new Error("Limite de uso da IA atingido. Tente novamente mais tarde.");
  }
}
