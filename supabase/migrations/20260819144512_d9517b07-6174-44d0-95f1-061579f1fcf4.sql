-- 1. Enum para status detalhado dos itens do relatório de comissão
DO $$ BEGIN
    CREATE TYPE public.commission_item_status AS ENUM ('pending_review', 'confirmed', 'corrected', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar campo para hash do arquivo em documentos para detecção de duplicidade
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_hash text;

-- 3. Atualizar document_processing para suportar granularidade de itens e metadados de custo
ALTER TABLE public.document_processing 
ADD COLUMN IF NOT EXISTS input_tokens integer,
ADD COLUMN IF NOT EXISTS output_tokens integer,
ADD COLUMN IF NOT EXISTS estimated_cost numeric(10,5),
ADD COLUMN IF NOT EXISTS execution_duration_ms integer;

-- 4. Função para validar duplicidade de comissão
CREATE OR REPLACE FUNCTION public.check_commission_duplicate(
    _policy_id uuid,
    _due_date date,
    _expected_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    found_id uuid;
BEGIN
    SELECT id INTO found_id
    FROM public.commissions
    WHERE policy_id = _policy_id
      AND due_date = _due_date
      AND expected_amount = _expected_amount
    LIMIT 1;
    
    RETURN found_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_commission_duplicate TO authenticated;

-- 5. RPC para processar aprovação de item de comissão
CREATE OR REPLACE FUNCTION public.process_commission_item_approval(
    _document_id uuid,
    _item jsonb,
    _user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_policy_id uuid;
    v_commission_id uuid;
    v_receipt_id uuid;
    v_result jsonb;
BEGIN
    -- Check permissions
    IF NOT (public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'financeiro')) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- 1. Try to find policy
    -- Prioritize policy_number
    SELECT id INTO v_policy_id
    FROM public.policies
    WHERE policy_number = _item->>'policy_number'
    LIMIT 1;

    -- 2. Check/Create Commission
    IF v_policy_id IS NOT NULL THEN
        -- Look for existing commission
        v_commission_id := public.check_commission_duplicate(
            v_policy_id,
            (_item->>'due_date')::date,
            (_item->>'expected_commission')::numeric
        );

        IF v_commission_id IS NULL THEN
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
            -- Update existing
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

        -- 3. Create Receipt
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

        -- 4. Create Revenue record
        INSERT INTO public.revenue (
            description,
            amount,
            date,
            category,
            notes
        ) VALUES (
            'Comissão - Apólice ' || (_item->>'policy_number'),
            (_item->>'paid_commission')::numeric,
            (_item->>'payment_date')::date,
            'commission',
            'Vínculo com comissão ' || v_commission_id
        );

        RETURN jsonb_build_object(
            'status', 'success',
            'commission_id', v_commission_id,
            'policy_id', v_policy_id
        );
    ELSE
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Policy not found'
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_commission_item_approval TO authenticated;
