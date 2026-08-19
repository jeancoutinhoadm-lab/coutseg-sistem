-- Revoke execute on handle_new_user from public, anon, and authenticated
-- This function is only intended to be called by the auth system (service_role) as a trigger
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
