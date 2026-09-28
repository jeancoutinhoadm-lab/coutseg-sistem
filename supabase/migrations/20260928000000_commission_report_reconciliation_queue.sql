-- Persisted, review-first reconciliation queue for multi-policy commission reports.
-- It never changes an existing commission or creates a receipt during extraction.

CREATE TABLE IF NOT EXISTS public.commission_report_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
  source_index integer NOT NULL CHECK (source_index > 0),
  source_fingerprint text NOT NULL,
  insurer_name text,
  report_reference text,
  policy_number_normalized text,
  parcel_number text,
  expected_amount numeric(12,2),
  reported_amount numeric(12,2),
  due_date date,
  payment_date date,
  match_status text NOT NULL DEFAULT 'pending_reconciliation'
    CHECK (match_status IN ('pending_reconciliation', 'matched', 'divergent', 'posted')),
  reconciliation_reason text,
  matched_policy_id uuid REFERENCES public.policies(id) ON DELETE RESTRICT,
  matched_commission_id uuid REFERENCES public.commissions(id) ON DELETE RESTRICT,
  receipt_id uuid REFERENCES public.commission_receipts(id) ON DELETE RESTRICT,
  posted_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, source_index)
);

ALTER TABLE public.commission_receipts
  ADD COLUMN IF NOT EXISTS source_report_item_id uuid
  REFERENCES public.commission_report_items(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS commission_receipts_source_report_item_id_key
  ON public.commission_receipts(source_report_item_id)
  WHERE source_report_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commission_report_items_queue
  ON public.commission_report_items(match_status, created_at DESC);

ALTER TABLE public.commission_report_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commission_report_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.commission_report_items TO authenticated;

CREATE POLICY "commission_report_items_select_finance" ON public.commission_report_items
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gerente')
  OR public.has_role(auth.uid(), 'financeiro')
);

CREATE OR REPLACE FUNCTION public.stage_commission_report_extraction(
  _document_id uuid,
  _insurer_name text,
  _report_reference text,
  _items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_index integer;
  v_policy_number text;
  v_expected_amount numeric(12,2);
  v_reported_amount numeric(12,2);
  v_due_date date;
  v_payment_date date;
  v_insurer_id uuid;
  v_insurer_count integer;
  v_policy_id uuid;
  v_policy_count integer;
  v_commission_id uuid;
  v_commission_count integer;
  v_match_status text;
  v_reason text;
  v_fingerprint text;
BEGIN
  IF v_user_id IS NULL OR NOT (
    public.has_role(v_user_id, 'admin')
    OR public.has_role(v_user_id, 'gerente')
    OR public.has_role(v_user_id, 'financeiro')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: sem permissão para preparar a conciliação de comissões.';
  END IF;

  IF jsonb_typeof(_items) <> 'array' THEN
    RAISE EXCEPTION 'Itens extraídos inválidos.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.documents d
    JOIN public.document_processing dp ON dp.document_id = d.id
    WHERE d.id = _document_id AND dp.type = 'commission_report'
  ) THEN
    RAISE EXCEPTION 'Documento de relatório de comissão não encontrado.';
  END IF;

  SELECT count(*), min(i.id)
    INTO v_insurer_count, v_insurer_id
  FROM public.insurers i
  WHERE i.active IS TRUE
    AND nullif(regexp_replace(upper(coalesce(i.name, '')), '[^A-Z0-9]', '', 'g'), '') =
        nullif(regexp_replace(upper(coalesce(_insurer_name, '')), '[^A-Z0-9]', '', 'g'), '');

  FOR v_item, v_index IN
    SELECT value, ordinality::integer
    FROM jsonb_array_elements(_items) WITH ORDINALITY
  LOOP
    v_policy_number := nullif(regexp_replace(upper(coalesce(v_item->>'policy_number', '')), '[^A-Z0-9]', '', 'g'), '');
    v_expected_amount := NULL;
    v_reported_amount := NULL;
    v_due_date := NULL;
    v_payment_date := NULL;

    BEGIN
      IF (v_item->>'expected_commission') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
        v_expected_amount := (v_item->>'expected_commission')::numeric(12,2);
      END IF;
      IF (v_item->>'paid_commission') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
        v_reported_amount := (v_item->>'paid_commission')::numeric(12,2);
      END IF;
      IF (v_item->>'due_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
        v_due_date := (v_item->>'due_date')::date;
      END IF;
      IF (v_item->>'payment_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
        v_payment_date := (v_item->>'payment_date')::date;
      END IF;
    EXCEPTION WHEN others THEN
      v_due_date := NULL;
      v_payment_date := NULL;
    END;

    v_policy_id := NULL;
    v_commission_id := NULL;
    v_match_status := 'pending_reconciliation';
    v_reason := NULL;

    IF v_insurer_count <> 1 THEN
      v_reason := CASE WHEN v_insurer_count = 0 THEN 'seguradora_não_identificada' ELSE 'seguradora_ambígua' END;
    ELSIF v_policy_number IS NULL THEN
      v_reason := 'número_da_apólice_ausente';
    ELSE
      SELECT count(*), min(p.id)
        INTO v_policy_count, v_policy_id
      FROM public.policies p
      WHERE p.insurer_id = v_insurer_id
        AND regexp_replace(upper(p.policy_number), '[^A-Z0-9]', '', 'g') = v_policy_number;

      IF v_policy_count = 0 THEN
        v_reason := 'apólice_não_encontrada_para_a_seguradora';
      ELSIF v_policy_count > 1 THEN
        v_policy_id := NULL;
        v_reason := 'apólice_ambígua';
      ELSIF v_expected_amount IS NULL THEN
        v_reason := 'valor_esperado_ausente';
      ELSE
        SELECT count(*), min(c.id)
          INTO v_commission_count, v_commission_id
        FROM public.commissions c
        WHERE c.policy_id = v_policy_id
          AND c.expected_amount = v_expected_amount
          AND (v_due_date IS NULL OR c.due_date = v_due_date);

        IF v_commission_count = 0 THEN
          v_reason := 'comissão_esperada_não_encontrada';
        ELSIF v_commission_count > 1 THEN
          v_commission_id := NULL;
          v_reason := 'comissão_esperada_ambígua';
        ELSIF v_reported_amount IS NULL THEN
          v_reason := 'valor_recebido_ausente';
        ELSIF v_reported_amount = v_expected_amount THEN
          v_match_status := 'matched';
          v_reason := 'correspondência_exata_aguardando_confirmação';
        ELSE
          v_match_status := 'divergent';
          v_reason := 'divergência_entre_valor_esperado_e_informado';
        END IF;
      END IF;
    END IF;

    v_fingerprint := md5(concat_ws('|', coalesce(_insurer_name, ''), coalesce(_report_reference, ''), coalesce(v_policy_number, ''), coalesce(v_item->>'parcel_number', ''), coalesce(v_expected_amount::text, ''), coalesce(v_reported_amount::text, ''), coalesce(v_due_date::text, ''), coalesce(v_payment_date::text, '')));

    INSERT INTO public.commission_report_items (
      document_id, source_index, source_fingerprint, insurer_name, report_reference,
      policy_number_normalized, parcel_number, expected_amount, reported_amount,
      due_date, payment_date, match_status, reconciliation_reason,
      matched_policy_id, matched_commission_id, updated_at
    ) VALUES (
      _document_id, v_index, v_fingerprint, nullif(btrim(_insurer_name), ''), nullif(btrim(_report_reference), ''),
      v_policy_number, nullif(btrim(v_item->>'parcel_number'), ''), v_expected_amount, v_reported_amount,
      v_due_date, v_payment_date, v_match_status, v_reason, v_policy_id, v_commission_id, now()
    )
    ON CONFLICT (document_id, source_index) DO UPDATE SET
      source_fingerprint = EXCLUDED.source_fingerprint,
      insurer_name = EXCLUDED.insurer_name,
      report_reference = EXCLUDED.report_reference,
      policy_number_normalized = EXCLUDED.policy_number_normalized,
      parcel_number = EXCLUDED.parcel_number,
      expected_amount = EXCLUDED.expected_amount,
      reported_amount = EXCLUDED.reported_amount,
      due_date = EXCLUDED.due_date,
      payment_date = EXCLUDED.payment_date,
      match_status = EXCLUDED.match_status,
      reconciliation_reason = EXCLUDED.reconciliation_reason,
      matched_policy_id = EXCLUDED.matched_policy_id,
      matched_commission_id = EXCLUDED.matched_commission_id,
      updated_at = now()
    WHERE public.commission_report_items.match_status <> 'posted';
  END LOOP;

  RETURN (
    SELECT jsonb_build_object(
      'document_id', _document_id,
      'staged', count(*),
      'matched', count(*) FILTER (WHERE match_status = 'matched'),
      'divergent', count(*) FILTER (WHERE match_status = 'divergent'),
      'pending_reconciliation', count(*) FILTER (WHERE match_status = 'pending_reconciliation')
    )
    FROM public.commission_report_items
    WHERE document_id = _document_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_commission_report_item(_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item public.commission_report_items%ROWTYPE;
  v_receipt_id uuid;
BEGIN
  IF v_user_id IS NULL OR NOT (
    public.has_role(v_user_id, 'admin') OR public.has_role(v_user_id, 'financeiro')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: apenas Admin ou Financeiro podem confirmar recebimentos.';
  END IF;

  SELECT * INTO v_item
  FROM public.commission_report_items
  WHERE id = _item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item de conciliação não encontrado.';
  END IF;
  IF v_item.match_status = 'posted' THEN
    RETURN jsonb_build_object('status', 'already_posted', 'receipt_id', v_item.receipt_id);
  END IF;
  IF v_item.match_status NOT IN ('matched', 'divergent') OR v_item.matched_commission_id IS NULL OR v_item.reported_amount IS NULL THEN
    RAISE EXCEPTION 'Item não possui correspondência segura para lançamento.';
  END IF;

  INSERT INTO public.commission_receipts (
    commission_id, amount, receipt_date, document_id, source_report_item_id, notes
  ) VALUES (
    v_item.matched_commission_id,
    v_item.reported_amount,
    COALESCE(v_item.payment_date, current_date),
    v_item.document_id,
    v_item.id,
    'Recebimento confirmado a partir de relatório de comissão conciliado.'
  )
  ON CONFLICT (source_report_item_id) WHERE source_report_item_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_receipt_id;

  IF v_receipt_id IS NULL THEN
    SELECT id INTO v_receipt_id
    FROM public.commission_receipts
    WHERE source_report_item_id = v_item.id;
  END IF;

  UPDATE public.commission_report_items
  SET match_status = 'posted', receipt_id = v_receipt_id, posted_by = v_user_id, posted_at = now(), updated_at = now()
  WHERE id = v_item.id;

  RETURN jsonb_build_object('status', 'posted', 'receipt_id', v_receipt_id, 'commission_id', v_item.matched_commission_id);
END;
$$;

REVOKE ALL ON FUNCTION public.stage_commission_report_extraction(uuid, text, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_commission_report_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stage_commission_report_extraction(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_commission_report_item(uuid) TO authenticated;
