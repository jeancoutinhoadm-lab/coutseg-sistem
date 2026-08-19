DROP POLICY IF EXISTS "crm_activities_all" ON public.crm_activities;
DROP POLICY IF EXISTS "crm_activities_isolation" ON public.crm_activities;
CREATE POLICY "crm_activities_isolation" ON public.crm_activities
FOR ALL TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    EXISTS (
        SELECT 1 FROM public.opportunities o 
        JOIN public.brokers b ON o.broker_id = b.id
        WHERE o.id = opportunity_id AND b.user_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.leads l 
        JOIN public.brokers b ON l.broker_id = b.id
        WHERE l.id = lead_id AND b.user_id = auth.uid()
    )
);