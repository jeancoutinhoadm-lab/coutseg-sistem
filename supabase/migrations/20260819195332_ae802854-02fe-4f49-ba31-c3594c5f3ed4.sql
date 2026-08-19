-- Quotes
DROP POLICY IF EXISTS "quotes_select" ON public.quotes;
DROP POLICY IF EXISTS "quotes_all" ON public.quotes;
DROP POLICY IF EXISTS "quotes_isolation" ON public.quotes;
CREATE POLICY "quotes_isolation" ON public.quotes
FOR ALL TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    EXISTS (
        SELECT 1 FROM public.opportunities o 
        JOIN public.brokers b ON o.broker_id = b.id
        WHERE o.id = opportunity_id AND b.user_id = auth.uid()
    )
);

-- CRM History
DROP POLICY IF EXISTS "crm_history_select" ON public.crm_history;
DROP POLICY IF EXISTS "crm_history_isolation" ON public.crm_history;
CREATE POLICY "crm_history_isolation" ON public.crm_history
FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    EXISTS (
        SELECT 1 FROM public.opportunities o 
        JOIN public.brokers b ON o.broker_id = b.id
        WHERE o.id = opportunity_id AND b.user_id = auth.uid()
    )
);