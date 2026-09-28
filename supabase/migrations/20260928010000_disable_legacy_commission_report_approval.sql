-- The legacy approval path matched only a raw policy number and could create
-- financial records directly from AI output. New reports must use the
-- persisted, strict reconciliation queue instead.
REVOKE ALL ON FUNCTION public.approve_commission_report_item(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
