-- Reinforcing search_path for all SECURITY DEFINER functions to prevent search_path hijacking
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
ALTER FUNCTION public.approve_document_extraction(uuid) SET search_path = public;
ALTER FUNCTION public.log_task_changes() SET search_path = public;
ALTER FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) SET search_path = public;
ALTER FUNCTION public.reconcile_commission(uuid, text, text, numeric) SET search_path = public;
ALTER FUNCTION public.reconcile_commission(uuid, numeric, text, uuid, jsonb) SET search_path = public;

-- Revoke EXECUTE from PUBLIC/anon for all sensitive functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_document_extraction(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_task_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_commission(uuid, text, text, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reconcile_commission(uuid, numeric, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- Grant back only to necessary roles
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_document_extraction(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_commission(uuid, text, text, numeric) TO authenticated, service_role;

-- handle_new_user, log_task_changes, etc. are trigger/internal functions and should generally only be called by service_role or the system
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_task_changes() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_commission(uuid, numeric, text, uuid, jsonb) TO service_role;