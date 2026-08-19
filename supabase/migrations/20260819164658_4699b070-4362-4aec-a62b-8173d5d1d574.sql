-- 1. CORREÇÃO DE SEARCH_PATH EM FUNÇÕES EXISTENTES
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
ALTER FUNCTION public.is_period_open(date) SET search_path = public;
ALTER FUNCTION public.enforce_period_lock() SET search_path = public;
ALTER FUNCTION public.check_commission_divergence() SET search_path = public;
ALTER FUNCTION public.update_commission_status() SET search_path = public;
ALTER FUNCTION public.create_initial_commission() SET search_path = public;

-- 2. RESTRINGIR EXECUTE EM FUNÇÕES DE TRIGGER (Devem ser executadas apenas pelo sistema)
REVOKE EXECUTE ON FUNCTION public.enforce_period_lock() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_commission_divergence() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_commission_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_initial_commission() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_physical_delete() FROM PUBLIC;
