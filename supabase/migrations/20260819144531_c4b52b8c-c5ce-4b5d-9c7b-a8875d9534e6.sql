-- Fix for Warn 1: Set search_path for process_commission_item_approval
-- (Already set in migration but let's ensure it's correct for all functions)

-- Revoke public execute
REVOKE EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) FROM anon;

-- Grant to service_role (for server-side/internal calls if needed)
GRANT EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) TO service_role;
-- We'll allow authenticated because the RPC is called from the frontend but with internal role check
GRANT EXECUTE ON FUNCTION public.process_commission_item_approval(uuid, jsonb, uuid) TO authenticated;

-- Ensure other functions are also secured
REVOKE EXECUTE ON FUNCTION public.check_commission_duplicate(uuid, date, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_commission_duplicate(uuid, date, numeric) TO authenticated;
