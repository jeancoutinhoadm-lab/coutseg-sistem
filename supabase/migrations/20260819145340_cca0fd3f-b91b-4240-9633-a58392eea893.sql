-- 1. Revogar execução pública de funções sensíveis e conceder apenas aos papéis necessários
REVOKE ALL ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) TO service_role;

-- 2. Garantir search_path seguro em funções SECURITY DEFINER já existentes ou novas
ALTER FUNCTION public.has_role(_user_id uuid, _role app_role) SET search_path = public;
ALTER FUNCTION public.process_commission_item_approval(_document_id uuid, _item jsonb, _user_id uuid) SET search_path = public;
