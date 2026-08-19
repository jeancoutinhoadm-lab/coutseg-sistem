-- 1. BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    bank_name text,
    account_type text DEFAULT 'checking',
    balance numeric(12,2) DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and admin manage bank accounts" ON public.bank_accounts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'));

-- 2. EVOLVE COMMISSIONS
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS divergence_amount numeric(12,2) DEFAULT 0;
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_status_check;
ALTER TABLE public.commissions ADD CONSTRAINT commissions_status_check 
    CHECK (status IN ('pending', 'partial', 'paid', 'divergent', 'cancelled', 'expected'));

-- 3. COMMISSION RECEIPTS
CREATE TABLE IF NOT EXISTS public.commission_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_id uuid REFERENCES public.commissions(id) ON DELETE CASCADE,
    amount numeric(12,2) NOT NULL,
    receipt_date date NOT NULL,
    bank_account_id uuid REFERENCES public.bank_accounts(id),
    document_id uuid REFERENCES public.documents(id),
    notes text,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_receipts TO authenticated;
GRANT ALL ON public.commission_receipts TO service_role;
ALTER TABLE public.commission_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and admin manage commission receipts" ON public.commission_receipts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "Brokers view own commission receipts" ON public.commission_receipts FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.commissions c
    JOIN public.policies p ON p.id = c.policy_id
    JOIN public.brokers b ON b.id = p.broker_id
    WHERE c.id = commission_receipts.commission_id AND b.user_id = auth.uid()
));

-- 4. EVOLVE EXPENSES
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurrence boolean DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS due_day integer;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id);

-- 5. TRIGGERS
CREATE OR REPLACE FUNCTION public.create_initial_commission()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.commissions WHERE policy_id = NEW.id) THEN
        INSERT INTO public.commissions (policy_id, expected_amount, status)
        VALUES (NEW.id, COALESCE(NEW.commission_amount, 0), 'expected');
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_commission_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
    total_received numeric(12,2);
    expected numeric(12,2);
    comm_id uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        comm_id := OLD.commission_id;
    ELSE
        comm_id := NEW.commission_id;
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO total_received 
    FROM public.commission_receipts 
    WHERE commission_id = comm_id;

    SELECT expected_amount INTO expected 
    FROM public.commissions 
    WHERE id = comm_id;

    UPDATE public.commissions
    SET 
        received_amount = total_received,
        divergence_amount = total_received - expected,
        status = CASE 
            WHEN total_received = 0 THEN 'expected'
            WHEN total_received > 0 AND total_received < expected THEN 'partial'
            WHEN total_received = expected THEN 'paid'
            WHEN total_received > expected THEN 'divergent'
            ELSE 'expected'
        END,
        received_date = CASE WHEN total_received >= expected THEN now()::date ELSE NULL END
    WHERE id = comm_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_update_commission_status ON public.commission_receipts;
CREATE TRIGGER tr_update_commission_status
AFTER INSERT OR UPDATE OR DELETE ON public.commission_receipts
FOR EACH ROW EXECUTE FUNCTION public.update_commission_status();

-- 6. POLICIES & INTEGRITY
DROP POLICY IF EXISTS "Admin and finance manage revenue" ON public.revenue;
CREATE POLICY "Finance staff manage revenue" ON public.revenue FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'));

DROP POLICY IF EXISTS "Admin and finance manage expenses" ON public.expenses;
CREATE POLICY "Finance staff manage expenses" ON public.expenses FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'));

DROP POLICY IF EXISTS "Finance manage commissions" ON public.commissions;
CREATE POLICY "Finance staff manage commissions" ON public.commissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'));

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
