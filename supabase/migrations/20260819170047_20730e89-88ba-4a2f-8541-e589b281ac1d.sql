-- 1. Enum para status de Lead
DO $$ BEGIN
    CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela de Leads
CREATE TABLE IF NOT EXISTS public.leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    email text,
    phone text,
    cpf_cnpj text,
    source text,
    status public.lead_status DEFAULT 'new',
    broker_id uuid REFERENCES public.brokers(id),
    client_id uuid REFERENCES public.clients(id),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Expansão de Oportunidades
ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id),
ADD COLUMN IF NOT EXISTS loss_reason text,
ADD COLUMN IF NOT EXISTS closed_at timestamptz,
ADD COLUMN IF NOT EXISTS value_estimated numeric(12,2),
ADD COLUMN IF NOT EXISTS value_realized numeric(12,2);

-- 4. Tabela de Cotações
CREATE TABLE IF NOT EXISTS public.quotes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
    insurer_id uuid REFERENCES public.insurers(id),
    product_id uuid REFERENCES public.products(id),
    premium numeric(12,2),
    commission_estimated numeric(12,2),
    pdf_url text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'rejected')),
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 5. Atividades de CRM
CREATE TABLE IF NOT EXISTS public.crm_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
    type text NOT NULL,
    description text NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- 6. Histórico de CRM
CREATE TABLE IF NOT EXISTS public.crm_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
    field text NOT NULL,
    old_value text,
    new_value text,
    changed_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- 7. RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_history ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
GRANT ALL ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
GRANT ALL ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
GRANT ALL ON public.crm_history TO authenticated;
GRANT ALL ON public.crm_history TO service_role;

-- Policies
CREATE POLICY "leads_select" ON public.leads FOR SELECT TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    (public.has_role(auth.uid(), 'corretor') AND broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()))
);

CREATE POLICY "leads_all" ON public.leads FOR ALL TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    (public.has_role(auth.uid(), 'corretor') AND broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()))
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    (public.has_role(auth.uid(), 'corretor') AND broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()))
);

CREATE POLICY "quotes_select" ON public.quotes FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "quotes_all" ON public.quotes FOR ALL TO authenticated 
USING (true) WITH CHECK (true);

CREATE POLICY "crm_activities_all" ON public.crm_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "crm_history_select" ON public.crm_history FOR SELECT TO authenticated USING (true);
