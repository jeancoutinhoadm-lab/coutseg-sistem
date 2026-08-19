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
-- Add divergence and ensure status is consistent
DO $$ 
BEGIN
    -- Check if we need to add columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='commissions' AND column_name='divergence_amount') THEN
        ALTER TABLE public.commissions ADD COLUMN divergence_amount numeric(12,2) DEFAULT 0;
    END IF;
    
    -- Update status constraint if needed
    ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_status_check;
    ALTER TABLE public.commissions ADD CONSTRAINT commissions_status_check 
        CHECK (status IN ('pending', 'partial', 'paid', 'divergent', 'cancelled', 'expected'));
END $$;

-- 3. COMMISSION RECEIPTS (Multiple payments)
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

-- 4. EVOLVE EXPENSES (Recurrence prep)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurrence boolean DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS due_day integer;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id);

-- 5. FIX COMMISSION TRIGGER (Idempotency)
CREATE OR REPLACE FUNCTION public.create_initial_commission()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
    -- Only insert if not exists for this policy
    IF NOT EXISTS (SELECT 1 FROM public.commissions WHERE policy_id = NEW.id) THEN
        INSERT INTO public.commissions (policy_id, expected_amount, status)
        VALUES (NEW.id, COALESCE(NEW.commission_amount, 0), 'expected');
    END IF;
    RETURN NEW;
END;
$function$;

-- 6. STATUS UPDATE TRIGGER
CREATE OR REPLACE FUNCTION public.update_commission_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $function$
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
            WHEN total_received < expected THEN 'partial'
            WHEN total_received = expected THEN 'paid'
            ELSE 'divergent'
        END,
        received_date = CASE WHEN total_received >= expected THEN now()::date ELSE NULL END
    WHERE id = comm_id;

    RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS tr_update_commission_status ON public.commission_receipts;
CREATE TRIGGER tr_update_commission_status
AFTER INSERT OR UPDATE OR DELETE ON public.commission_receipts
FOR EACH ROW EXECUTE FUNCTION public.update_commission_status();

-- 7. INDICES
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_policy_id ON public.commissions(policy_id);
CREATE INDEX IF NOT EXISTS idx_commission_receipts_commission_id ON public.commission_receipts(commission_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
