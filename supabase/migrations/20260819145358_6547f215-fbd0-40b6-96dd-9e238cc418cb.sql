-- Corrigindo search_path para todas as funções citadas pelo linter
ALTER FUNCTION public.approve_document_extraction(uuid) SET search_path = public;
ALTER FUNCTION public.check_commission_duplicate(uuid, date, numeric) SET search_path = public;

-- Revogando permissões PUBLIC e restringindo
REVOKE ALL ON FUNCTION public.approve_document_extraction(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_document_extraction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_document_extraction(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.check_commission_duplicate(uuid, date, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_commission_duplicate(uuid, date, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_commission_duplicate(uuid, date, numeric) TO service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
