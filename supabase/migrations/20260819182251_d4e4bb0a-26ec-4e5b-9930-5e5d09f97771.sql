
-- Correção de Segurança: Linter Warnings (SECURITY DEFINER accessibility)

-- 1. Revogar execução pública de has_role (já feito em migrações anteriores, mas reforçando)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- 2. Revogar execução de funções handle_new_user e update_updated_at_column
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;

-- 3. Revogar execução de funções de aprovação de OCR
REVOKE EXECUTE ON FUNCTION public.approve_document_extraction(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_document_extraction(uuid) FROM anon;

-- 4. Garantir privilégios apenas para service_role ou authenticated conforme necessidade
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

GRANT EXECUTE ON FUNCTION public.approve_document_extraction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_document_extraction(uuid) TO service_role;
