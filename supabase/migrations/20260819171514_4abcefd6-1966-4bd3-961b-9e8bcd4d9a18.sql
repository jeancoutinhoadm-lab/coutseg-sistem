
-- Tipos de Insight
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'insight_type') THEN
        CREATE TYPE public.insight_type AS ENUM (
            'CROSS_SELL', 
            'RENEWAL_RISK', 
            'COMMERCIAL', 
            'FINANCIAL', 
            'COMMISSION', 
            'OPERATIONAL', 
            'DOCUMENT', 
            'PRODUCTIVITY', 
            'ANOMALY'
        );
    END IF;
END $$;

-- Severidade
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'insight_severity') THEN
        CREATE TYPE public.insight_severity AS ENUM (
            'INFO', 
            'LOW', 
            'MEDIUM', 
            'HIGH', 
            'CRITICAL'
        );
    END IF;
END $$;

-- Status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'insight_status') THEN
        CREATE TYPE public.insight_status AS ENUM (
            'NEW', 
            'REVIEWED', 
            'DISMISSED', 
            'ACTED'
        );
    END IF;
END $$;

-- Tabela de Insights
CREATE TABLE IF NOT EXISTS public.business_insights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type public.insight_type NOT NULL,
    severity public.insight_severity NOT NULL DEFAULT 'INFO',
    status public.insight_status NOT NULL DEFAULT 'NEW',
    title text NOT NULL,
    description text NOT NULL,
    evidence jsonb,
    suggested_action text,
    entity_related text,
    entity_id uuid,
    broker_id uuid REFERENCES public.brokers(id),
    user_id uuid REFERENCES auth.users(id),
    origin text DEFAULT 'SYSTEM',
    ai_confidence float,
    feedback_useful boolean,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.business_insights ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.business_insights TO authenticated;
GRANT ALL ON public.business_insights TO service_role;

-- Políticas de RLS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins e Gerentes podem ver todos os insights') THEN
        CREATE POLICY "Admins e Gerentes podem ver todos os insights"
        ON public.business_insights FOR SELECT
        TO authenticated
        USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Usuários veem insights próprios ou do seu corretor') THEN
        CREATE POLICY "Usuários veem insights próprios ou do seu corretor"
        ON public.business_insights FOR SELECT
        TO authenticated
        USING (
            user_id = auth.uid() OR 
            (broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()))
        );
    END IF;
END $$;

-- Trigger de Auditoria (se existir handle_audit_log)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_audit_log') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_business_insight_change') THEN
            CREATE TRIGGER on_business_insight_change
                AFTER INSERT OR UPDATE OR DELETE ON public.business_insights
                FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();
        END IF;
    END IF;
END $$;
