-- Refatorar a RPC para suportar reported_amount e motor de conciliação
CREATE OR REPLACE FUNCTION public.process_commission_item_approval(
    _document_id uuid, 
    _item jsonb, 
    _user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_policy_id uuid;
    v_commission_id uuid;
    v_receipt_id uuid;
    v_processing_status text;
    v_val_status text;
BEGIN
    -- 0. Validar permissão (ADMIN ou FINANCEIRO)
    IF NOT (public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'financeiro')) THEN
        RAISE EXCEPTION 'Unauthorized: Usuário sem permissão financeira.';
    END IF;

    -- 1. Verificar integridade do processamento
    SELECT status, validation_status INTO v_processing_status, v_val_status
    FROM public.document_processing 
    WHERE document_id = _document_id 
    ORDER BY created_at DESC LIMIT 1;

    IF v_processing_status = 'approved' OR v_processing_status = 'completed' THEN
         RAISE EXCEPTION 'Documento já processado ou finalizado.';
    END IF;

    -- 2. Tentar encontrar apólice (Matching Motor Step 4)
    SELECT id INTO v_policy_id
    FROM public.policies
    WHERE policy_number = _item->>'policy_number'
    LIMIT 1;

    IF v_policy_id IS NULL THEN
        RAISE EXCEPTION 'Apólice % não encontrada. A aprovação requer apólices pré-existentes no sistema.', _item->>'policy_number';
    END IF;

    -- 3. Verificar duplicidade/idempotência
    v_commission_id := public.check_commission_duplicate(
        v_policy_id,
        (_item->>'due_date')::date,
        (_item->>'expected_commission')::numeric
    );

    IF v_commission_id IS NULL THEN
        -- Criar nova comissão (Se não houver matching)
        INSERT INTO public.commissions (
            policy_id,
            expected_amount,
            reported_amount,
            received_amount,
            status,
            due_date,
            received_date,
            statement_document_id
        ) VALUES (
            v_policy_id,
            COALESCE((_item->>'expected_commission')::numeric, 0),
            COALESCE((_item->>'paid_commission')::numeric, 0),
            0, -- Não assumir recebimento real sem confirmação bancária
            CASE
                WHEN (_item->>'paid_commission')::numeric = (_item->>'expected_commission')::numeric THEN 'matched'
                ELSE 'divergent'
            END,
            (_item->>'due_date')::date,
            (_item->>'payment_date')::date,
            _document_id
        ) RETURNING id INTO v_commission_id;
    ELSE
        -- Vincular ao registro existente e calcular divergência (reported vs expected)
        UPDATE public.commissions
        SET
            reported_amount = COALESCE((_item->>'paid_commission')::numeric, 0),
            statement_document_id = _document_id,
            divergence_amount = COALESCE((_item->>'paid_commission')::numeric, 0) - expected_amount,
            status = CASE
                WHEN COALESCE((_item->>'paid_commission')::numeric, 0) = expected_amount THEN 'matched'
                ELSE 'divergent'
            END
        WHERE id = v_commission_id;
    END IF;

    -- Auditoria automática via trigger já existente em commissions

    RETURN jsonb_build_object(
        'status', 'success',
        'commission_id', v_commission_id
    );
END;
$$;
