-- Fix mutable search_path on prevent_physical_delete
ALTER FUNCTION public.prevent_physical_delete() SET search_path = public;

-- Revoke public execute
REVOKE EXECUTE ON FUNCTION public.prevent_physical_delete() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_physical_delete() TO authenticated, service_role;
