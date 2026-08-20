-- Fix PostgREST relationship detection by adding explicit foreign keys to profiles table
-- This resolves HTTP 400 (PGRST200) when joining with responsible/profiles

ALTER TABLE public.tasks 
  DROP CONSTRAINT IF EXISTS tasks_user_id_profiles_fkey,
  ADD CONSTRAINT tasks_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.tasks 
  DROP CONSTRAINT IF EXISTS tasks_creator_id_profiles_fkey,
  ADD CONSTRAINT tasks_creator_id_profiles_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id);

ALTER TABLE public.policies 
  DROP CONSTRAINT IF EXISTS policies_responsible_user_id_profiles_fkey,
  ADD CONSTRAINT policies_responsible_user_id_profiles_fkey FOREIGN KEY (responsible_user_id) REFERENCES public.profiles(id);

-- Ensure authenticated role has necessary grants to see these relationships in PostgREST
GRANT SELECT ON public.tasks TO authenticated;
GRANT SELECT ON public.policies TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.clients TO authenticated;
GRANT SELECT ON public.insurers TO authenticated;
GRANT SELECT ON public.opportunities TO authenticated;
GRANT SELECT ON public.leads TO authenticated;
GRANT SELECT ON public.products TO authenticated;
GRANT SELECT ON public.commissions TO authenticated;
GRANT SELECT ON public.payables TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
