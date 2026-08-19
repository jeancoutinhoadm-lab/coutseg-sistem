-- 1. Expansão da document_processing para métricas de validação
ALTER TABLE public.document_processing ADD COLUMN IF NOT EXISTS document_line_count INTEGER;
ALTER TABLE public.document_processing ADD COLUMN IF NOT EXISTS extracted_line_count INTEGER;
ALTER TABLE public.document_processing ADD COLUMN IF NOT EXISTS document_total NUMERIC(15,2);
ALTER TABLE public.document_processing ADD COLUMN IF NOT EXISTS extracted_total NUMERIC(15,2);
ALTER TABLE public.document_processing ADD COLUMN IF NOT EXISTS validation_status TEXT CHECK (validation_status IN ('pending', 'success', 'failed', 'unknown')) DEFAULT 'pending';
ALTER TABLE public.document_processing ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]'::jsonb;

-- 2. Idempotência por Hash de Arquivo
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON public.documents(file_hash);

-- 3. Refatoração da RPC de Aprovação Financeira Atômica
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
BEGIN
    -- 0. Validar permissão (ADMIN ou FINANCEIRO)
    IF NOT (public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'financeiro')) THEN
        RAISE EXCEPTION 'Unauthorized: Usuário sem permissão financeira.';
    END IF;

    -- 1. Verificar se o processamento do documento permite aprovação
    SELECT status INTO v_processing_status 
    FROM public.document_processing 
    WHERE document_id = _document_id 
    ORDER BY created_at DESC LIMIT 1;

    IF v_processing_status = 'approved' OR v_processing_status = 'completed' THEN
         RAISE EXCEPTION 'Documento já processado ou finalizado.';
    END IF;

    -- 2. Tentar encontrar apólice
    SELECT id INTO v_policy_id
    FROM public.policies
    WHERE policy_number = _item->>'policy_number'
    LIMIT 1;

    IF v_policy_id IS NULL THEN
        RAISE EXCEPTION 'Apólice % não encontrada. A aprovação requer apólices pré-existentes no sistema.', _item->>'policy_number';
    END IF;

    -- 3. Verificar duplicidade de comissão (Idempotência financeira)
    v_commission_id := public.check_commission_duplicate(
        v_policy_id,
        (_item->>'due_date')::date,
        (_item->>'expected_commission')::numeric
    );

    IF v_commission_id IS NULL THEN
        -- Criar nova comissão
        INSERT INTO public.commissions (
            policy_id,
            expected_amount,
            received_amount,
            status,
            due_date,
            received_date,
            statement_document_id
        ) VALUES (
            v_policy_id,
            (_item->>'expected_commission')::numeric,
            (_item->>'paid_commission')::numeric,
            CASE
                WHEN (_item->>'paid_commission')::numeric >= (_item->>'expected_commission')::numeric THEN 'paid'
                WHEN (_item->>'paid_commission')::numeric > 0 THEN 'partial'
                ELSE 'pending'
            END,
            (_item->>'due_date')::date,
            (_item->>'payment_date')::date,
            _document_id
        ) RETURNING id INTO v_commission_id;
    ELSE
        -- Verificar se este recibo já foi importado deste mesmo documento
        IF EXISTS (SELECT 1 FROM public.commission_receipts WHERE commission_id = v_commission_id AND document_id = _document_id) THEN
             RETURN jsonb_build_object('status', 'already_processed', 'commission_id', v_commission_id);
        END IF;

        -- Atualizar comissão existente
        UPDATE public.commissions
        SET
            received_amount = COALESCE(received_amount, 0) + (_item->>'paid_commission')::numeric,
            received_date = (_item->>'payment_date')::date,
            statement_document_id = _document_id,
            status = CASE
                WHEN (COALESCE(received_amount, 0) + (_item->>'paid_commission')::numeric) >= expected_amount THEN 'paid'
                ELSE 'partial'
            END
        WHERE id = v_commission_id;
    END IF;

    -- 4. Criar Recibo
    INSERT INTO public.commission_receipts (
        commission_id,
        amount,
        receipt_date,
        document_id,
        notes
    ) VALUES (
        v_commission_id,
        (_item->>'paid_commission')::numeric,
        (_item->>'payment_date')::date,
        _document_id,
        'Importado via IA (Relatório de Comissão)'
    ) RETURNING id INTO v_receipt_id;

    -- 5. Criar Receita
    INSERT INTO public.revenue (
        amount,
        date,
        description,
        category,
        status,
        related_id
    ) VALUES (
        (_item->>'paid_commission')::numeric,
        (_item->>'payment_date')::date,
        'Comissão Apólice ' || (_item->>'policy_number'),
        'comissao',
        'received',
        v_receipt_id
    );

    RETURN jsonb_build_object(
        'status', 'success',
        'commission_id', v_commission_id,
        'receipt_id', v_receipt_id
    );
END;
$$;