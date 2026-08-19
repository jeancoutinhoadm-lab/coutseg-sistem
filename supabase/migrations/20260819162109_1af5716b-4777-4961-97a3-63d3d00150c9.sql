-- Corrigir calculate_policy_priority (Search path mutable)
ALTER FUNCTION public.calculate_policy_priority(date) SET search_path = public;

-- Revogar EXECUTE de SECURITY DEFINER functions para o público (anon) e garantir controle
-- 1. has_role (usada em RLS, deve ser SECURITY DEFINER mas restrita)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- 2. approve_document_extraction (ação administrativa)
REVOKE EXECUTE ON FUNCTION public.approve_document_extraction(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_document_extraction(uuid) TO authenticated, service_role;

-- 3. process_commission_item_approval (ação financeira)
REVOKE EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) TO authenticated, service_role;

-- 4. reconcile_commission (ambas as assinaturas)
REVOKE EXECUTE ON FUNCTION public.reconcile_commission(uuid, numeric, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_commission(uuid, numeric, text, uuid, jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reconcile_commission(uuid, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_commission(uuid, text, text, numeric) TO authenticated, service_role;

-- Garantir search_path em todas as críticas
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION public.approve_document_extraction(uuid) SET search_path = public;
ALTER FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) SET search_path = public;
ALTER FUNCTION public.reconcile_commission(uuid, numeric, text, uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.reconcile_commission(uuid, text, text, numeric) SET search_path = public;
