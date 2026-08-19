-- Revogar explicitamente da função que ainda permite anon
REVOKE EXECUTE ON FUNCTION public.reconcile_commission(uuid, numeric, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_commission(uuid, numeric, text, uuid, jsonb) TO authenticated, service_role;

-- Limpeza preventiva de outras permissões em SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- As demais já estão corretas (f para anon, t para authenticated),
-- o linter avisa que autenticados podem rodar SECURITY DEFINER, o que é intencional
-- para funções de negócio como aprovação de documentos e conciliação.
