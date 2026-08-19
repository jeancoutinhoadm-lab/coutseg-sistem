-- 1. Criar Leads (se não existir por erro na migração anterior)
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

-- 2. Tabela de Cotações (N cotações por Oportunidade)
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

-- 3. Atividades de CRM (Log de ligações, reuniões, notas)
CREATE TABLE IF NOT EXISTS public.crm_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
    type text NOT NULL, -- call, email, meeting, note, task, conversion, loss
    description text NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- 4. RLS e Grants
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
GRANT ALL ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
GRANT ALL ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;

-- 5. Policies
CREATE POLICY "leads_isolation" ON public.leads FOR ALL TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    (public.has_role(auth.uid(), 'corretor') AND broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()))
);

CREATE POLICY "quotes_isolation" ON public.quotes FOR ALL TO authenticated 
USING (true) WITH CHECK (true);

CREATE POLICY "crm_activities_isolation" ON public.crm_activities FOR ALL TO authenticated 
USING (true) WITH CHECK (true);
