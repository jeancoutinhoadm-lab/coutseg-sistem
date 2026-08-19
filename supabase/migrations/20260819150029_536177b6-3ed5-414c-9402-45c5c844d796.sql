-- 1. Adicionar reported_amount à tabela commissions se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='commissions' AND column_name='reported_amount') THEN
        ALTER TABLE public.commissions ADD COLUMN reported_amount numeric(12,2) DEFAULT 0;
    END IF;
END $$;

-- 2. Criar a tabela de conciliação de comissões
CREATE TABLE IF NOT EXISTS public.commission_reconciliations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_id uuid REFERENCES public.commissions(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    reconciliation_date timestamptz DEFAULT now(),
    previous_status text,
    new_status text,
    adjustment_amount numeric(12,2) DEFAULT 0,
    reason text NOT NULL,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- 3. Grants e RLS para a nova tabela
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_reconciliations TO authenticated;
GRANT ALL ON public.commission_reconciliations TO service_role;
ALTER TABLE public.commission_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and admin manage reconciliations" ON public.commission_reconciliations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gerente'));

-- 4. Função RPC para conciliação manual
CREATE OR REPLACE FUNCTION public.reconcile_commission(
    _commission_id uuid,
    _new_status text,
    _reason text,
    _adjustment_amount numeric DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_status text;
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    
    -- Verificar permissão
    IF NOT (public.has_role(v_user_id, 'admin') OR public.has_role(v_user_id, 'financeiro') OR public.has_role(v_user_id, 'gerente')) THEN
        RAISE EXCEPTION 'Unauthorized: Usuário sem permissão financeira.';
    END IF;

    -- Obter status atual
    SELECT status INTO v_old_status FROM public.commissions WHERE id = _commission_id;
    
    -- Registrar conciliação
    INSERT INTO public.commission_reconciliations (
        commission_id,
        user_id,
        previous_status,
        new_status,
        adjustment_amount,
        reason
    ) VALUES (
        _commission_id,
        v_user_id,
        v_old_status,
        _new_status,
        _adjustment_amount,
        _reason
    );

    -- Atualizar comissão
    UPDATE public.commissions
    SET 
        status = _new_status,
        divergence_amount = divergence_amount - _adjustment_amount
    WHERE id = _commission_id;

    -- Auditoria
    INSERT INTO public.audit_logs (user_id, action, entity, record_id, old_data, new_data)
    VALUES (
        v_user_id,
        'UPDATE',
        'commissions',
        _commission_id,
        jsonb_build_object('status', v_old_status, 'divergence_amount', (SELECT divergence_amount FROM public.commissions WHERE id = _commission_id)),
        jsonb_build_object('status', _new_status, 'reason', _reason)
    );

    RETURN jsonb_build_object('status', 'success', 'reconciled', true);
END;
$$;
