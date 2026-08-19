-- 1. ADICIONAR COLUNAS DE FECHAMENTO MENSAL
CREATE TABLE IF NOT EXISTS public.financial_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_month DATE NOT NULL UNIQUE, -- Representado pelo primeiro dia do mês
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES auth.users(id),
    reopened_at TIMESTAMPTZ,
    reopened_by UUID REFERENCES auth.users(id),
    reopening_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.financial_periods TO authenticated;
GRANT ALL ON public.financial_periods TO service_role;
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and Finance manage periods" ON public.financial_periods
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- 2. FUNÇÃO PARA VERIFICAR SE O PERÍODO ESTÁ ABERTO
CREATE OR REPLACE FUNCTION public.is_period_open(check_date DATE)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM public.financial_periods
        WHERE period_month = date_trunc('month', check_date)::date
        AND status = 'closed'
    );
END;
$$;

-- 3. TRAVAS DE SEGURANÇA (RLS & TRIGGERS) PARA PERÍODOS FECHADOS
CREATE OR REPLACE FUNCTION public.enforce_period_lock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Se for INSERT ou UPDATE, verifica a data de competência/emissão
    IF NOT public.is_period_open(COALESCE(NEW.competence_date, NEW.entry_date, NEW.receipt_date, NEW.date)) THEN
        IF NOT public.has_role(auth.uid(), 'admin') THEN
            RAISE EXCEPTION 'O período financeiro para esta data está fechado.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Aplicar em financial_entries, payables e commission_receipts
DROP TRIGGER IF EXISTS tr_lock_entries ON public.financial_entries;
CREATE TRIGGER tr_lock_entries BEFORE INSERT OR UPDATE ON public.financial_entries FOR EACH ROW EXECUTE FUNCTION public.enforce_period_lock();

DROP TRIGGER IF EXISTS tr_lock_payables ON public.payables;
CREATE TRIGGER tr_lock_payables BEFORE INSERT OR UPDATE ON public.payables FOR EACH ROW EXECUTE FUNCTION public.enforce_period_lock();

DROP TRIGGER IF EXISTS tr_lock_commissions ON public.commission_receipts;
CREATE TRIGGER tr_lock_commissions BEFORE INSERT OR UPDATE ON public.commission_receipts FOR EACH ROW EXECUTE FUNCTION public.enforce_period_lock();

-- 4. JUSTIFICATIVA OBRIGATÓRIA PARA DIVERGÊNCIA EM COMISSÃO
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS divergence_justification TEXT;

CREATE OR REPLACE FUNCTION public.check_commission_divergence()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.divergence_amount <> 0 AND NEW.divergence_justification IS NULL AND NEW.status IN ('divergent', 'paid') THEN
        RAISE EXCEPTION 'Justificativa obrigatória para divergência de valores na comissão.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_commission_divergence ON public.commissions;
CREATE TRIGGER tr_check_commission_divergence BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.check_commission_divergence();
