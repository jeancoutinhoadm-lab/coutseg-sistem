
-- Fix Security Linter Issues

-- 1. Enable RLS on user_roles and audit_logs (redundant but safe)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Revoke public execution of has_role function
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
-- We also need authenticated to use it in RLS, but the security definer pattern
-- works through the policy itself. Wait, if used in RLS, the role needs execute permission?
-- In Supabase, the user executing the query needs EXECUTE on the function used in the policy.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- To fix "Signed-In Users Can Execute SECURITY DEFINER Function" warning,
-- if it's meant to be internal-only, we should keep it revoked and use it in policies.
-- However, Supabase linter flags it if 'authenticated' can execute it.
-- The fix is to ensure the function is only callable by the system or carefully guarded.
-- Actually, the best practice is to move it to a private schema or ensure it validates the caller.
-- But for RLS, 'authenticated' needs it. I will keep the grant but ensure the logic is solid.
-- To satisfy the linter, we can sometimes use SECURITY INVOKER if it doesn't need to bypass RLS,
-- but our user_roles table HAS RLS, so has_role MUST be SECURITY DEFINER to avoid recursion.

-- 3. Ensure audit_logs has a policy for RLS
DO $$ BEGIN
    CREATE POLICY "Service role can do everything on audit_logs" ON public.audit_logs
        FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
