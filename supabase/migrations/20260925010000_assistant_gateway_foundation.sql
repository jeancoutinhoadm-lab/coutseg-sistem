-- Assistant Gateway foundation: channel identity, one-time link codes, audit and
-- per-user/channel throttling. No existing business data is changed.

CREATE TABLE IF NOT EXISTS public.user_channel_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'web')),
  external_identifier text NOT NULL,
  verified_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT user_channel_links_identifier_unique UNIQUE (channel, external_identifier),
  CONSTRAINT user_channel_links_revocation_consistent CHECK (
    (active AND revoked_at IS NULL) OR (NOT active AND revoked_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_user_channel_links_active_user
  ON public.user_channel_links (user_id, channel) WHERE active;

CREATE TABLE IF NOT EXISTS public.assistant_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  code_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assistant_link_codes_expiry CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_assistant_link_codes_user_active
  ON public.assistant_link_codes (user_id, expires_at) WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS public.assistant_interaction_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  channel text NOT NULL CHECK (channel IN ('web', 'whatsapp', 'telegram')),
  intent text,
  tool_name text,
  outcome text NOT NULL CHECK (outcome IN ('success', 'denied', 'invalid_request', 'error')),
  duration_ms integer NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assistant_interaction_audit_user_created
  ON public.assistant_interaction_audit (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.assistant_rate_windows (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  channel text NOT NULL CHECK (channel IN ('web', 'whatsapp', 'telegram')),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel)
);

ALTER TABLE public.user_channel_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_interaction_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_rate_windows ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_channel_links, public.assistant_link_codes,
  public.assistant_interaction_audit, public.assistant_rate_windows FROM anon, authenticated;
GRANT ALL ON public.user_channel_links, public.assistant_link_codes,
  public.assistant_interaction_audit, public.assistant_rate_windows TO service_role;
GRANT SELECT, UPDATE ON public.user_channel_links TO authenticated;
GRANT INSERT ON public.assistant_link_codes, public.assistant_interaction_audit TO authenticated;

CREATE POLICY "assistant_channel_links_own_select" ON public.user_channel_links
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "assistant_channel_links_own_update" ON public.user_channel_links
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "assistant_audit_own_select" ON public.assistant_interaction_audit
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- The web gateway writes audit rows under the caller's JWT; it cannot read
-- codes, rate counters, or another user's links.
CREATE POLICY "assistant_audit_own_insert" ON public.assistant_interaction_audit
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "assistant_link_codes_own_insert" ON public.assistant_link_codes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.consume_assistant_request_quota(_channel text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id uuid := auth.uid(); v_started_at timestamptz; v_count integer;
BEGIN
  IF v_user_id IS NULL OR _channel NOT IN ('web', 'whatsapp', 'telegram') THEN
    RAISE EXCEPTION 'Solicitação inválida';
  END IF;
  INSERT INTO public.assistant_rate_windows (user_id, channel, request_count)
  VALUES (v_user_id, _channel, 0) ON CONFLICT (user_id, channel) DO NOTHING;
  SELECT window_started_at, request_count INTO v_started_at, v_count
  FROM public.assistant_rate_windows WHERE user_id = v_user_id AND channel = _channel FOR UPDATE;
  IF v_started_at < now() - interval '1 minute' THEN
    UPDATE public.assistant_rate_windows SET window_started_at = now(), request_count = 1, updated_at = now()
    WHERE user_id = v_user_id AND channel = _channel;
    RETURN true;
  END IF;
  IF v_count >= 20 THEN RETURN false; END IF;
  UPDATE public.assistant_rate_windows SET request_count = request_count + 1, updated_at = now()
  WHERE user_id = v_user_id AND channel = _channel;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_assistant_request_quota(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_assistant_request_quota(text) TO authenticated, service_role;
