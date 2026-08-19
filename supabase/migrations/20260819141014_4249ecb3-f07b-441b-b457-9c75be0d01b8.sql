-- Migração Corretiva para Cargos, Permissões e RLS (Etapa 3 - v2.2)

-- 1. Limpeza de Políticas Permissivas
-- TASKS
DROP POLICY IF EXISTS "Manage items" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    user_id = auth.uid()
);

CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    user_id = auth.uid()
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    user_id = auth.uid()
);

CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR user_id = auth.uid());

-- OPPORTUNITIES
DROP POLICY IF EXISTS "Manage items" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can manage opportunities" ON public.opportunities;

CREATE POLICY "opportunities_select" ON public.opportunities FOR SELECT TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    (public.has_role(auth.uid(), 'corretor') AND broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()))
);

CREATE POLICY "opportunities_all" ON public.opportunities FOR ALL TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    (public.has_role(auth.uid(), 'corretor') AND broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()))
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    (public.has_role(auth.uid(), 'corretor') AND broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()))
);

-- COMMISSIONS
DROP POLICY IF EXISTS "Manage items" ON public.commissions;

CREATE POLICY "commissions_select" ON public.commissions FOR SELECT TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'financeiro') OR 
    (public.has_role(auth.uid(), 'corretor') AND EXISTS (
        SELECT 1 FROM public.policies p 
        WHERE p.id = commissions.policy_id 
        AND p.broker_id IN (SELECT b.id FROM public.brokers b WHERE b.user_id = auth.uid())
    ))
);

CREATE POLICY "commissions_manage" ON public.commissions FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- REVENUE
DROP POLICY IF EXISTS "Manage items" ON public.revenue;
CREATE POLICY "revenue_admin_finance" ON public.revenue FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- EXPENSES / CATEGORIES
DROP POLICY IF EXISTS "Manage items" ON public.expenses;
DROP POLICY IF EXISTS "Manage items" ON public.expense_categories;
DROP POLICY IF EXISTS "Authenticated view expense categories" ON public.expense_categories;

CREATE POLICY "expenses_admin_finance" ON public.expenses FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

CREATE POLICY "expense_categories_admin_finance" ON public.expense_categories FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- EMPLOYEES / SALARY_PAYMENTS
DROP POLICY IF EXISTS "Manage items" ON public.employees;
DROP POLICY IF EXISTS "Manage items" ON public.salary_payments;

CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'financeiro'));

CREATE POLICY "employees_manage" ON public.employees FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "salary_payments_admin_finance" ON public.salary_payments FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- DOCUMENT PROCESSING
DROP POLICY IF EXISTS "Manage items" ON public.document_processing;
CREATE POLICY "document_processing_select" ON public.document_processing FOR SELECT TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_processing.document_id AND d.uploaded_by = auth.uid())
);
CREATE POLICY "document_processing_manage" ON public.document_processing FOR ALL TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_processing.document_id AND d.uploaded_by = auth.uid())
);

-- 2. Proteção de USER_ROLES
DROP POLICY IF EXISTS "Service role can manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Refinar CLIENTS e POLICIES
-- CLIENTS
DROP POLICY IF EXISTS "Admins and Managers view all clients" ON public.clients;
DROP POLICY IF EXISTS "Brokers view own clients" ON public.clients;
DROP POLICY IF EXISTS "Staff view all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins and Staff can insert/update clients" ON public.clients;
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_manage" ON public.clients;

CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    public.has_role(auth.uid(), 'financeiro') OR
    (public.has_role(auth.uid(), 'corretor') AND broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()))
);

CREATE POLICY "clients_manage" ON public.clients FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo'));

-- POLICIES
DROP POLICY IF EXISTS "Admins and Managers view all policies" ON public.policies;
DROP POLICY IF EXISTS "Brokers view own policies" ON public.policies;
DROP POLICY IF EXISTS "Staff view all policies" ON public.policies;
DROP POLICY IF EXISTS "Admins and Staff can manage policies" ON public.policies;
DROP POLICY IF EXISTS "policies_select" ON public.policies;
DROP POLICY IF EXISTS "policies_manage" ON public.policies;

CREATE POLICY "policies_select" ON public.policies FOR SELECT TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    public.has_role(auth.uid(), 'financeiro') OR
    (public.has_role(auth.uid(), 'corretor') AND broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()))
);

CREATE POLICY "policies_manage" ON public.policies FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo'));

-- 4. Função has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
END;
$$;