-- Recriar a RPC com a assinatura correta e parâmetros desejados
CREATE OR REPLACE FUNCTION public.reconcile_commission(
    _commission_id uuid,
    _adjustment_amount numeric,
    _reason text,
    _user_id uuid,
    _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prev_status text;
BEGIN
    -- 1. Validar permissão
    IF NOT (public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'financeiro')) THEN
        RAISE EXCEPTION 'Unauthorized: Apenas Admin ou Financeiro podem conciliar comissões.';
    END IF;

    -- 2. Obter status atual
    SELECT status INTO v_prev_status FROM public.commissions WHERE id = _commission_id;
    
    -- 3. Registrar a reconciliação
    INSERT INTO public.commission_reconciliations (
        commission_id,
        adjustment_amount,
        reason,
        user_id,
        previous_status,
        new_status,
        metadata
    ) VALUES (
        _commission_id,
        _adjustment_amount,
        _reason,
        _user_id,
        v_prev_status,
        'reconciled',
        _metadata
    );

    -- 4. Atualizar a comissão
    UPDATE public.commissions
    SET 
        status = 'reconciled',
        divergence_amount = 0 -- Ao conciliar, assumimos que a divergência foi tratada
    WHERE id = _commission_id;

    RETURN jsonb_build_object('status', 'success', 'commission_id', _commission_id);
END;
$$;

-- Lockdown de segurança
REVOKE EXECUTE ON FUNCTION public.reconcile_commission(uuid, numeric, text, uuid, jsonb) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_commission(uuid, numeric, text, uuid, jsonb) TO service_role;
