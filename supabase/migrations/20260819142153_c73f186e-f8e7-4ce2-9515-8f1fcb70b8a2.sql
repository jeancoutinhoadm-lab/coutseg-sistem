
-- 1. EVOLVE ENUMS
-- Postgres doesn't allow direct ALTER TYPE for enums inside transactions easily, so we handle it by creating a new one if needed, 
-- but here we'll use a safer approach for the environment:
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'policy_status' AND e.enumlabel = 'lead') THEN
        -- Since we can't easily drop and recreate without affecting columns, we add them one by one
        ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'lead';
        ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'quotation';
        ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'proposal';
        ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'analyzing';
        ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'issued';
        ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'renewed';
        ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'refused';
    END IF;
END $$;

-- 2. ADD TRACKING COLUMNS
ALTER TABLE public.policies 
ADD COLUMN IF NOT EXISTS renewed_from_policy_id uuid REFERENCES public.policies(id),
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS cancellation_date date,
ADD COLUMN IF NOT EXISTS issuance_date date,
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- 3. INDICES FOR RENEWALS AND EXPIRATION
CREATE INDEX IF NOT EXISTS idx_policies_renewed_from ON public.policies(renewed_from_policy_id);
CREATE INDEX IF NOT EXISTS idx_policies_cancellation_date ON public.policies(cancellation_date);

-- 4. VIEW FOR EXPIRATION (Helper for UI)
-- We don't necessarily need a view, but complex filters are better documented here
-- Ex: SELECT * FROM policies WHERE end_date BETWEEN now() AND now() + interval '30 days';

-- 5. GRANTS AND RLS (Preserve existing logic but ensure new columns are accessible)
GRANT SELECT, INSERT, UPDATE ON public.policies TO authenticated;
GRANT ALL ON public.policies TO service_role;
