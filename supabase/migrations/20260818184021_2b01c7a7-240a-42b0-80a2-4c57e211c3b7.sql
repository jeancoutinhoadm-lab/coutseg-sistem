-- Fix mutable search_path on trigger functions
CREATE OR REPLACE FUNCTION public.audit_financial_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity, record_id, old_data, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END);
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_initial_commission()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    INSERT INTO public.commissions (policy_id, expected_amount, status)
    VALUES (NEW.id, COALESCE(NEW.commission_amount, 0), 'pending');
    RETURN NEW;
END;
$function$;

-- BROKERS
DROP POLICY IF EXISTS "All authenticated can view brokers" ON public.brokers;
CREATE POLICY "Managers and self can view brokers" ON public.brokers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR user_id = auth.uid());

-- CLAIMS
DROP POLICY IF EXISTS "Authenticated users can manage claims" ON public.claims;
CREATE POLICY "Staff manage claims" ON public.claims FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo') OR public.has_role(auth.uid(),'gerente'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo') OR public.has_role(auth.uid(),'gerente'));
CREATE POLICY "Brokers view own claims" ON public.claims FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.policies p JOIN public.brokers b ON b.id = p.broker_id
  WHERE p.id = claims.policy_id AND b.user_id = auth.uid()));

-- COMMISSIONS
DROP POLICY IF EXISTS "Manage items" ON public.commissions;
CREATE POLICY "Finance manage commissions" ON public.commissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gerente'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gerente'));
CREATE POLICY "Brokers view own commissions" ON public.commissions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.policies p JOIN public.brokers b ON b.id = p.broker_id
  WHERE p.id = commissions.policy_id AND b.user_id = auth.uid()));

-- DOCUMENT PROCESSING
DROP POLICY IF EXISTS "Manage items" ON public.document_processing;
CREATE POLICY "Staff manage document processing" ON public.document_processing FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo') OR public.has_role(auth.uid(),'financeiro'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo') OR public.has_role(auth.uid(),'financeiro'));

-- EMPLOYEES
DROP POLICY IF EXISTS "Manage items" ON public.employees;
CREATE POLICY "Admin and finance manage employees" ON public.employees FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro'));

-- SALARY PAYMENTS
DROP POLICY IF EXISTS "Manage items" ON public.salary_payments;
CREATE POLICY "Admin and finance manage salaries" ON public.salary_payments FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro'));

-- REVENUE
DROP POLICY IF EXISTS "Manage items" ON public.revenue;
CREATE POLICY "Admin and finance manage revenue" ON public.revenue FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gerente'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro'));

-- EXPENSES
DROP POLICY IF EXISTS "Manage items" ON public.expenses;
CREATE POLICY "Admin and finance manage expenses" ON public.expenses FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gerente'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro'));

-- EXPENSE CATEGORIES
DROP POLICY IF EXISTS "Manage items" ON public.expense_categories;
CREATE POLICY "Authenticated view expense categories" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and finance manage expense categories" ON public.expense_categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro'));

-- OPPORTUNITIES
DROP POLICY IF EXISTS "Manage items" ON public.opportunities;
CREATE POLICY "Staff manage opportunities" ON public.opportunities FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente') OR public.has_role(auth.uid(),'administrativo'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente') OR public.has_role(auth.uid(),'administrativo'));
CREATE POLICY "Brokers manage own opportunities" ON public.opportunities FOR ALL TO authenticated
USING (broker_id IN (SELECT b.id FROM public.brokers b WHERE b.user_id = auth.uid()))
WITH CHECK (broker_id IN (SELECT b.id FROM public.brokers b WHERE b.user_id = auth.uid()));

-- TASKS
DROP POLICY IF EXISTS "Manage items" ON public.tasks;
CREATE POLICY "Users manage own tasks" ON public.tasks FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins and managers manage all tasks" ON public.tasks FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'));
