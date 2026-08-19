
-- Etapa 12: Central de Renovação e Oportunidades Comerciais

-- 1. Expansão do ciclo de vida de apólices e renovação
DO $$ BEGIN
    ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'upcoming';
    ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'contact_pending';
    ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'contacted';
    ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'quote_in_progress';
    ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'quote_sent';
    ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'negotiation';
    ALTER TYPE public.policy_status ADD VALUE IF NOT EXISTS 'lost';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.policies 
ADD COLUMN IF NOT EXISTS renewed_from_policy_id uuid REFERENCES public.policies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS cancellation_date date,
ADD COLUMN IF NOT EXISTS issuance_date date,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low'));

-- 2. Tabela de Histórico de Renovação/Ações
CREATE TABLE IF NOT EXISTS public.renewal_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id uuid REFERENCES public.policies(id) ON DELETE CASCADE NOT NULL,
    action text NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid()
);

GRANT SELECT, INSERT ON public.renewal_history TO authenticated;
GRANT ALL ON public.renewal_history TO service_role;
ALTER TABLE public.renewal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see renewal history of policies they access"
    ON public.renewal_history FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.policies WHERE id = policy_id));

CREATE POLICY "Users can insert history for policies they access"
    ON public.renewal_history FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.policies WHERE id = policy_id));

-- 3. Tabela de Alertas de Renovação
CREATE TABLE IF NOT EXISTS public.renewal_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id uuid REFERENCES public.policies(id) ON DELETE CASCADE NOT NULL,
    days_to_expiry integer NOT NULL,
    viewed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    UNIQUE(policy_id, days_to_expiry)
);

GRANT SELECT, UPDATE, INSERT ON public.renewal_alerts TO authenticated;
GRANT ALL ON public.renewal_alerts TO service_role;
ALTER TABLE public.renewal_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage alerts for policies they access"
    ON public.renewal_alerts FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.policies WHERE id = policy_id));

-- 4. Expansão de Oportunidades (Cross-sell)
ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS evidence text,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS rule_id text,
ADD COLUMN IF NOT EXISTS original_policy_id uuid REFERENCES public.policies(id) ON DELETE SET NULL;

-- 5. Regras de Cross-sell (Configuráveis)
CREATE TABLE IF NOT EXISTS public.cross_sell_rules (
    id text PRIMARY KEY,
    source_product_id uuid REFERENCES public.products(id),
    target_product_id uuid REFERENCES public.products(id),
    description text,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.cross_sell_rules TO authenticated;
GRANT ALL ON public.cross_sell_rules TO service_role;
ALTER TABLE public.cross_sell_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can see rules"
    ON public.cross_sell_rules FOR SELECT TO authenticated
    USING (true);

-- 6. Função para calcular prioridade de renovação
CREATE OR REPLACE FUNCTION public.calculate_policy_priority(expiry_date date)
RETURNS text AS $$
DECLARE
    days integer;
BEGIN
    days := expiry_date - CURRENT_DATE;
    IF days <= 7 THEN RETURN 'urgent';
    ELSIF days <= 30 THEN RETURN 'high';
    ELSIF days <= 60 THEN RETURN 'normal';
    ELSE RETURN 'low';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;
