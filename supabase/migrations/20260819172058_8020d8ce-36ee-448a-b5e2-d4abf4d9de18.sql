
-- 1. Corrigir search_path nas funções remanescentes
ALTER FUNCTION public.log_task_changes() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.prevent_physical_delete() SET search_path = public;

-- 2. Restringir execução de funções SECURITY DEFINER críticas
-- Revogar acesso público (anon/authenticated) e conceder apenas conforme necessário

-- Função de criação de perfil (chamada pelo trigger de auth.users)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Funções operacionais sensíveis
REVOKE EXECUTE ON FUNCTION public.approve_document_extraction(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.approve_document_extraction(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.reconcile_commission(uuid, text, text, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_commission(uuid, text, text, numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reconcile_commission(uuid, numeric, text, uuid, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_commission(uuid, numeric, text, uuid, jsonb) TO service_role;

-- 3. Limpeza de funções duplicadas (se aplicável, mas aqui vamos apenas garantir search_path)
ALTER FUNCTION public.check_commission_duplicate(uuid, date, numeric) SET search_path = public;
