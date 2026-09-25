-- WhatsApp webhook perimeter. These records hold only hashed event identifiers
-- and minimal delivery state; no message body or credentials are persisted.
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_hash text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id),
  outcome text NOT NULL CHECK (outcome IN ('received', 'duplicate', 'unlinked_sender', 'linked_pending_delegation', 'invalid_payload', 'link_confirmed', 'link_denied')),
  created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_created ON public.whatsapp_webhook_events (created_at DESC);
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_webhook_events FROM anon, authenticated;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;

CREATE OR REPLACE FUNCTION public.redeem_whatsapp_link_code(_code_hash text, _external_identifier text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id uuid;
BEGIN
  IF length(_code_hash) <> 64 OR length(_external_identifier) < 4 OR length(_external_identifier) > 32 THEN RETURN NULL; END IF;
  SELECT user_id INTO v_user_id FROM public.assistant_link_codes
  WHERE code_hash = _code_hash AND used_at IS NULL AND expires_at > now() FOR UPDATE;
  IF v_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id) THEN RETURN NULL; END IF;
  UPDATE public.assistant_link_codes SET used_at = now() WHERE code_hash = _code_hash AND user_id = v_user_id AND used_at IS NULL;
  INSERT INTO public.user_channel_links (user_id, channel, external_identifier, verified_at, active, revoked_at)
  VALUES (v_user_id, 'whatsapp', _external_identifier, now(), true, NULL)
  ON CONFLICT (channel, external_identifier) DO UPDATE SET user_id = EXCLUDED.user_id, verified_at = now(), active = true, revoked_at = NULL;
  RETURN v_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_whatsapp_link_code(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_whatsapp_link_code(text, text) TO service_role;
