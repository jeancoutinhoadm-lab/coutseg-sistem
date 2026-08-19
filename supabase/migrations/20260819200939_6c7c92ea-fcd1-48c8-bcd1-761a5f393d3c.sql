CREATE POLICY "authenticated_insert_own_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
GRANT INSERT ON public.audit_logs TO authenticated;