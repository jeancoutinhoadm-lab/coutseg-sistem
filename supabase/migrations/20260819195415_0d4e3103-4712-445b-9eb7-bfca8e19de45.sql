-- 1. Renewal History Isolation
DROP POLICY IF EXISTS "Users can see renewal history of policies they access" ON public.renewal_history;
DROP POLICY IF EXISTS "Users can insert history for policies they access" ON public.renewal_history;
DROP POLICY IF EXISTS "renewal_history_isolation" ON public.renewal_history;
CREATE POLICY "renewal_history_isolation" ON public.renewal_history
FOR ALL TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    EXISTS (
        SELECT 1 FROM public.policies p
        JOIN public.brokers b ON p.broker_id = b.id
        WHERE p.id = policy_id AND b.user_id = auth.uid()
    )
);

-- 2. Renewal Alerts Isolation
DROP POLICY IF EXISTS "Users can manage alerts for policies they access" ON public.renewal_alerts;
DROP POLICY IF EXISTS "renewal_alerts_isolation" ON public.renewal_alerts;
CREATE POLICY "renewal_alerts_isolation" ON public.renewal_alerts
FOR ALL TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    EXISTS (
        SELECT 1 FROM public.policies p
        JOIN public.brokers b ON p.broker_id = b.id
        WHERE p.id = policy_id AND b.user_id = auth.uid()
    )
);

-- 3. Document Processing Isolation (Fixed: using document_id linkage)
DROP POLICY IF EXISTS "Users can view their own processing tasks" ON public.document_processing;
DROP POLICY IF EXISTS "Users can create processing tasks" ON public.document_processing;
DROP POLICY IF EXISTS "Staff manage document processing" ON public.document_processing;
DROP POLICY IF EXISTS "document_processing_manage_v3" ON public.document_processing;
DROP POLICY IF EXISTS "document_processing_select_v3" ON public.document_processing;
DROP POLICY IF EXISTS "document_processing_update_auth" ON public.document_processing;
DROP POLICY IF EXISTS "document_processing_isolation" ON public.document_processing;

CREATE POLICY "document_processing_isolation" ON public.document_processing
FOR ALL TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR
    EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.id = document_id AND d.uploaded_by = auth.uid()
    )
);

-- 4. Cost Centers Protection
DROP POLICY IF EXISTS "All authenticated users can see cost centers" ON public.cost_centers;
DROP POLICY IF EXISTS "cost_centers_select" ON public.cost_centers;
DROP POLICY IF EXISTS "cost_centers_manage" ON public.cost_centers;
CREATE POLICY "cost_centers_select" ON public.cost_centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "cost_centers_manage" ON public.cost_centers
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- 5. Final Grant Reinforcement
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;