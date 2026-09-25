-- Controlled WhatsApp delegation. These SECURITY DEFINER routines are the only
-- operational surface granted to service_role; no table privileges are granted
-- here and each routine re-evaluates the user's current role and broker scope.

ALTER TABLE public.whatsapp_webhook_events DROP CONSTRAINT IF EXISTS whatsapp_webhook_events_outcome_check;
ALTER TABLE public.whatsapp_webhook_events ADD CONSTRAINT whatsapp_webhook_events_outcome_check CHECK (outcome IN ('received','duplicate','unlinked_sender','linked_pending_delegation','invalid_payload','link_confirmed','link_denied','delegated_success','delegated_denied'));

CREATE OR REPLACE FUNCTION public.assistant_delegated_role(_delegated_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT ur.role::text
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  WHERE ur.user_id = _delegated_user_id
    AND u.banned_until IS NULL
    AND ur.role IN ('admin', 'gerente', 'financeiro', 'administrativo', 'corretor')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.assistant_delegated_has_any_role(_delegated_user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN auth.users u ON u.id=ur.user_id
    WHERE ur.user_id=_delegated_user_id AND u.banned_until IS NULL AND ur.role::text = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.assistant_can_read_client(_delegated_user_id uuid, _client_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF public.assistant_delegated_role(_delegated_user_id) IS NULL THEN RETURN false; END IF;
  IF public.assistant_delegated_has_any_role(_delegated_user_id, ARRAY['admin','gerente','financeiro','administrativo']) THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.clients c JOIN public.brokers b ON b.id = c.broker_id
    WHERE c.id = _client_id AND b.user_id = _delegated_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_assistant_delegated_quota(_delegated_user_id uuid, _channel text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_started_at timestamptz; v_count integer;
BEGIN
  IF _channel <> 'whatsapp' OR public.assistant_delegated_role(_delegated_user_id) IS NULL THEN RETURN false; END IF;
  INSERT INTO public.assistant_rate_windows (user_id, channel, request_count) VALUES (_delegated_user_id, _channel, 0)
  ON CONFLICT (user_id, channel) DO NOTHING;
  SELECT window_started_at, request_count INTO v_started_at, v_count FROM public.assistant_rate_windows
  WHERE user_id=_delegated_user_id AND channel=_channel FOR UPDATE;
  IF v_started_at < now() - interval '1 minute' THEN
    UPDATE public.assistant_rate_windows SET window_started_at=now(),request_count=1,updated_at=now() WHERE user_id=_delegated_user_id AND channel=_channel;
    RETURN true;
  END IF;
  IF v_count >= 20 THEN RETURN false; END IF;
  UPDATE public.assistant_rate_windows SET request_count=request_count+1,updated_at=now() WHERE user_id=_delegated_user_id AND channel=_channel;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.assistant_search_client(_delegated_user_id uuid, _query text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF public.assistant_delegated_role(_delegated_user_id) IS NULL OR length(trim(coalesce(_query,''))) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'delegação inválida';
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.full_name, 'status', c.status,
    'document', CASE WHEN c.cpf_cnpj IS NULL THEN NULL ELSE repeat('•', greatest(length(regexp_replace(c.cpf_cnpj, '\\D','','g')) - 4, 0)) || right(regexp_replace(c.cpf_cnpj, '\\D','','g'), 4) END))
    FROM (SELECT * FROM public.clients WHERE full_name ILIKE '%' || trim(_query) || '%' AND public.assistant_can_read_client(_delegated_user_id, id) ORDER BY full_name LIMIT 8) c), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.assistant_get_client_summary(_delegated_user_id uuid, _client_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE c public.clients%ROWTYPE;
BEGIN
  IF NOT public.assistant_can_read_client(_delegated_user_id, _client_id) THEN RAISE EXCEPTION 'acesso negado'; END IF;
  SELECT * INTO c FROM public.clients WHERE id = _client_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  RETURN jsonb_build_object('found', true, 'client', c.full_name, 'status', c.status,
    'activePolicies', (SELECT count(*) FROM public.policies p WHERE p.client_id = c.id AND p.status = 'active'),
    'policies', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'number',p.policy_number,'type',coalesce(pr.name,p.type::text),'status',p.status,'endDate',p.end_date) ORDER BY p.end_date)
      FROM (SELECT * FROM public.policies WHERE client_id=c.id AND public.assistant_can_read_client(_delegated_user_id, client_id) ORDER BY end_date LIMIT 30) p LEFT JOIN public.products pr ON pr.id=p.product_id), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.assistant_list_active_policies(_delegated_user_id uuid, _client_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF public.assistant_delegated_role(_delegated_user_id) IS NULL OR (_client_id IS NOT NULL AND NOT public.assistant_can_read_client(_delegated_user_id, _client_id)) THEN RAISE EXCEPTION 'acesso negado'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'number',p.policy_number,'client',c.full_name,'type',coalesce(pr.name,p.type::text),'endDate',p.end_date,'premium',p.premium) ORDER BY p.end_date)
    FROM (SELECT * FROM public.policies WHERE status='active' AND (_client_id IS NULL OR client_id=_client_id) AND public.assistant_can_read_client(_delegated_user_id,client_id) ORDER BY end_date LIMIT 30) p
    JOIN public.clients c ON c.id=p.client_id LEFT JOIN public.products pr ON pr.id=p.product_id), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.assistant_get_policy_summary(_delegated_user_id uuid, _policy_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF public.assistant_delegated_role(_delegated_user_id) IS NULL THEN RAISE EXCEPTION 'acesso negado'; END IF;
  RETURN COALESCE((SELECT jsonb_build_object('number',p.policy_number,'client',c.full_name,'insurer',i.name,'product',coalesce(pr.name,p.type::text),'status',p.status,'startDate',p.start_date,'endDate',p.end_date,'renewalDate',p.renewal_date,'premium',p.premium,'coverageAmount',p.coverage_amount)
    FROM public.policies p JOIN public.clients c ON c.id=p.client_id JOIN public.insurers i ON i.id=p.insurer_id LEFT JOIN public.products pr ON pr.id=p.product_id
    WHERE p.id=_policy_id AND public.assistant_can_read_client(_delegated_user_id,p.client_id)), jsonb_build_object('found',false));
END;
$$;

CREATE OR REPLACE FUNCTION public.assistant_list_upcoming_renewals(_delegated_user_id uuid, _days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF public.assistant_delegated_role(_delegated_user_id) IS NULL OR _days NOT BETWEEN 1 AND 90 THEN RAISE EXCEPTION 'delegação inválida'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'number',p.policy_number,'client',c.full_name,'product',coalesce(pr.name,p.type::text),'endDate',p.end_date,'renewalDate',p.renewal_date) ORDER BY p.end_date)
    FROM (SELECT * FROM public.policies WHERE status='active' AND end_date BETWEEN current_date AND current_date+_days AND public.assistant_can_read_client(_delegated_user_id,client_id) ORDER BY end_date LIMIT 50) p
    JOIN public.clients c ON c.id=p.client_id LEFT JOIN public.products pr ON pr.id=p.product_id), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.assistant_get_client_contact(_delegated_user_id uuid, _client_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.assistant_can_read_client(_delegated_user_id,_client_id) THEN RAISE EXCEPTION 'acesso negado'; END IF;
  RETURN COALESCE((SELECT jsonb_build_object('found',true,'name',full_name,'phone',coalesce(whatsapp,phone),'email',email) FROM public.clients WHERE id=_client_id), jsonb_build_object('found',false));
END;
$$;

CREATE OR REPLACE FUNCTION public.assistant_list_client_products(_delegated_user_id uuid, _client_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_name text;
BEGIN
  IF NOT public.assistant_can_read_client(_delegated_user_id,_client_id) THEN RAISE EXCEPTION 'acesso negado'; END IF;
  SELECT full_name INTO v_name FROM public.clients WHERE id=_client_id;
  RETURN jsonb_build_object('found', v_name IS NOT NULL, 'client',v_name,'products',COALESCE((SELECT jsonb_agg(DISTINCT coalesce(pr.name,p.type::text)) FROM public.policies p LEFT JOIN public.products pr ON pr.id=p.product_id WHERE p.client_id=_client_id AND p.status='active'),'[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.assistant_list_missing_cross_sell_products(_delegated_user_id uuid, _client_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_name text;
BEGIN
  IF NOT public.assistant_delegated_has_any_role(_delegated_user_id, ARRAY['admin','gerente','administrativo','corretor']) OR NOT public.assistant_can_read_client(_delegated_user_id,_client_id) THEN RAISE EXCEPTION 'acesso negado'; END IF;
  SELECT full_name INTO v_name FROM public.clients WHERE id=_client_id;
  RETURN jsonb_build_object('found',v_name IS NOT NULL,'client',v_name,'missingProducts',COALESCE((SELECT jsonb_agg(DISTINCT target.name)
    FROM public.cross_sell_rules r JOIN public.products target ON target.id=r.target_product_id
    WHERE r.active=true AND r.source_product_id IN (SELECT product_id FROM public.policies WHERE client_id=_client_id AND status='active' AND product_id IS NOT NULL)
      AND r.target_product_id NOT IN (SELECT product_id FROM public.policies WHERE client_id=_client_id AND status='active' AND product_id IS NOT NULL)),'[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.assistant_get_commission_summary(_delegated_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.assistant_delegated_has_any_role(_delegated_user_id, ARRAY['admin','gerente','financeiro']) THEN RAISE EXCEPTION 'acesso negado'; END IF;
  RETURN (SELECT jsonb_build_object('expected',coalesce(sum(expected_amount),0),'received',coalesce(sum(received_amount),0),'pending',count(*) FILTER (WHERE status IN ('pending','expected'))) FROM public.commissions);
END;
$$;

CREATE OR REPLACE FUNCTION public.assistant_list_pending_commissions(_delegated_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.assistant_delegated_has_any_role(_delegated_user_id, ARRAY['admin','gerente','financeiro']) THEN RAISE EXCEPTION 'acesso negado'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',x.id,'policy',x.policy_number,'client',x.full_name,'expected',x.expected_amount,'received',x.received_amount,'dueDate',x.due_date,'status',x.status) ORDER BY x.due_date)
    FROM (SELECT c.id,p.policy_number,cl.full_name,c.expected_amount,c.received_amount,c.due_date,c.status FROM public.commissions c LEFT JOIN public.policies p ON p.id=c.policy_id LEFT JOIN public.clients cl ON cl.id=p.client_id WHERE c.status IN ('pending','expected','partial','divergent') ORDER BY c.due_date LIMIT 50) x),'[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.assistant_delegated_role(uuid), public.assistant_delegated_has_any_role(uuid,text[]), public.assistant_can_read_client(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_assistant_delegated_quota(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assistant_search_client(uuid,text), public.assistant_get_client_summary(uuid,uuid), public.assistant_list_active_policies(uuid,uuid), public.assistant_get_policy_summary(uuid,uuid), public.assistant_list_upcoming_renewals(uuid,integer), public.assistant_get_client_contact(uuid,uuid), public.assistant_list_client_products(uuid,uuid), public.assistant_list_missing_cross_sell_products(uuid,uuid), public.assistant_get_commission_summary(uuid), public.assistant_list_pending_commissions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assistant_search_client(uuid,text), public.assistant_get_client_summary(uuid,uuid), public.assistant_list_active_policies(uuid,uuid), public.assistant_get_policy_summary(uuid,uuid), public.assistant_list_upcoming_renewals(uuid,integer), public.assistant_get_client_contact(uuid,uuid), public.assistant_list_client_products(uuid,uuid), public.assistant_list_missing_cross_sell_products(uuid,uuid), public.assistant_get_commission_summary(uuid), public.assistant_list_pending_commissions(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_assistant_delegated_quota(uuid,text) TO service_role;
