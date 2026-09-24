-- Fase 3: expõe somente entradas financeiras autenticadas e verificadas.
-- Não altera comissões, recebimentos ou histórico existentes.

CREATE OR REPLACE FUNCTION public.approve_commission_report_item(
  _document_id uuid,
  _item jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT (
    public.has_role(v_user_id, 'admin') OR public.has_role(v_user_id, 'financeiro')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: apenas Admin ou Financeiro podem aprovar comissões.';
  END IF;

  RETURN public.process_commission_item_approval(_document_id, _item, v_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_commission_authenticated(
  _commission_id uuid,
  _adjustment_amount numeric,
  _reason text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT (
    public.has_role(v_user_id, 'admin') OR public.has_role(v_user_id, 'financeiro')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: apenas Admin ou Financeiro podem conciliar comissões.';
  END IF;
  IF btrim(COALESCE(_reason, '')) = '' THEN
    RAISE EXCEPTION 'A justificativa da conciliação é obrigatória.';
  END IF;

  RETURN public.reconcile_commission(
    _commission_id,
    _adjustment_amount,
    _reason,
    v_user_id,
    _metadata
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_commission_report_item(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reconcile_commission_authenticated(uuid, numeric, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_commission_report_item(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_commission_authenticated(uuid, numeric, text, jsonb) TO authenticated;
