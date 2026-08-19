-- 1. Restringir execução da função reconcile_commission
REVOKE EXECUTE ON FUNCTION public.reconcile_commission(uuid, text, text, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reconcile_commission(uuid, text, text, numeric) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_commission(uuid, text, text, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.reconcile_commission(uuid, text, text, numeric) TO service_role;

-- 2. Restringir outras funções críticas
REVOKE EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.approve_document_extraction(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_document_extraction(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_document_extraction(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_document_extraction(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
