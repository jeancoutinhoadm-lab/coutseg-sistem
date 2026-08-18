
-- Final Security Fixes

-- 1. Fix user_roles RLS (was missing a policy for selection by the function itself or users)
-- The function has_role is SECURITY DEFINER, so it can see all user_roles regardless of policies.
-- However, the linter wants a policy if RLS is enabled.
CREATE POLICY "Service role can manage user_roles" ON public.user_roles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Address the SECURITY DEFINER warning by adding a check within the function
-- to ensure it only returns data relevant to the caller or is called in a safe context.
-- Or, just acknowledge that for RLS, 'authenticated' needs execute permission.
-- To satisfy the linter, we can check if the caller is checking their own role or is an admin.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to check their own roles, or admins to check anyone's
  IF (auth.uid() = _user_id) OR (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  ) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    );
  END IF;
  
  RETURN FALSE;
END;
$$;
