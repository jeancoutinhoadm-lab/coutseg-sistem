
-- 1. Definir search_path para funções SECURITY DEFINER críticas
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;

-- 2. Restringir financial_categories (remover permissão genérica 'Allow all for authenticated')
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.financial_categories;
CREATE POLICY "Admin and Finance manage categories" ON public.financial_categories
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "All authenticated can view categories" ON public.financial_categories
    FOR SELECT TO authenticated
    USING (true);

-- 3. Refinar RLS de Oportunidades para garantir isolamento por broker_id
DROP POLICY IF EXISTS "crm_activities_isolation" ON public.crm_activities;
CREATE POLICY "crm_activities_isolation_refined" ON public.crm_activities
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'gerente') OR 
        public.has_role(auth.uid(), 'administrativo') OR
        EXISTS (
            SELECT 1 FROM opportunities o
            JOIN brokers b ON b.id = o.broker_id
            WHERE o.id = crm_activities.opportunity_id 
            AND b.user_id = auth.uid()
        )
    );
