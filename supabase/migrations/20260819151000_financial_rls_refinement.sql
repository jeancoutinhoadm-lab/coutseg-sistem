-- 1. REVENUE POLICIES
DROP POLICY IF EXISTS "Admin and finance manage revenue" ON public.revenue;
CREATE POLICY "Finance staff manage revenue" ON public.revenue FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'));

-- 2. EXPENSES POLICIES
DROP POLICY IF EXISTS "Admin and finance manage expenses" ON public.expenses;
CREATE POLICY "Finance staff manage expenses" ON public.expenses FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'));

-- 3. COMMISSIONS POLICIES (Refined)
DROP POLICY IF EXISTS "Finance manage commissions" ON public.commissions;
CREATE POLICY "Finance staff manage commissions" ON public.commissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'));

-- 4. PREVENT PHYSICAL DELETE ON CRITICAL FINANCIAL TABLES
CREATE OR REPLACE FUNCTION public.prevent_physical_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Physical delete not allowed on this table. Use status = cancelled instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_prevent_delete_revenue ON public.revenue;
CREATE TRIGGER tr_prevent_delete_revenue BEFORE DELETE ON public.revenue FOR EACH ROW EXECUTE FUNCTION public.prevent_physical_delete();

DROP TRIGGER IF EXISTS tr_prevent_delete_expenses ON public.expenses;
CREATE TRIGGER tr_prevent_delete_expenses BEFORE DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.prevent_physical_delete();

DROP TRIGGER IF EXISTS tr_prevent_delete_commissions ON public.commissions;
CREATE TRIGGER tr_prevent_delete_commissions BEFORE DELETE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.prevent_physical_delete();
