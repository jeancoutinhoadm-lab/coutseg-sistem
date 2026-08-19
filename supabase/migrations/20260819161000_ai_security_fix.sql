-- 1. Revogar execução pública da função de aprovação
REVOKE EXECUTE ON FUNCTION public.approve_document_extraction(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_document_extraction(uuid) FROM anon;

-- 2. Garantir que apenas authenticated e service_role possam executar
GRANT EXECUTE ON FUNCTION public.approve_document_extraction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_document_extraction(uuid) TO service_role;

-- 3. A função já possui validação interna de cargo (ADMIN ou ADMINISTRATIVO), 
-- então o linter aponta o alerta mas a segurança lógica está garantida.
-- Vamos reforçar a segurança da função has_role também (boas práticas)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
