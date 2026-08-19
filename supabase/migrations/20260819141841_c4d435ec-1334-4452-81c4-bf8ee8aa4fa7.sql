
-- 1. DATA INTEGRITY CONSTRAINTS
-- Ensure end_date is after start_date
ALTER TABLE public.policies
ADD CONSTRAINT check_policy_dates CHECK (end_date > start_date);

-- 2. INDICES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_clients_broker_id ON public.clients(broker_id);
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj ON public.clients(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_policies_client_id ON public.policies(client_id);
CREATE INDEX IF NOT EXISTS idx_policies_broker_id ON public.policies(broker_id);
CREATE INDEX IF NOT EXISTS idx_policies_insurer_id ON public.policies(insurer_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON public.policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_end_date ON public.policies(end_date);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_policy_id ON public.documents(policy_id);

-- 3. UNIQUE CONSTRAINTS (Safe check for duplicates should be done before, but creating indices to prevent future ones)
-- We use unique indexes to allow multiple NULLs but unique values
CREATE UNIQUE INDEX IF NOT EXISTS unique_client_cpf_cnpj ON public.clients (cpf_cnpj) WHERE (cpf_cnpj IS NOT NULL AND cpf_cnpj <> '');
CREATE UNIQUE INDEX IF NOT EXISTS unique_insurer_cnpj ON public.insurers (cnpj) WHERE (cnpj IS NOT NULL AND cnpj <> '');

-- 4. REFINED RLS POLICIES

-- CLIENTS
DROP POLICY IF EXISTS "Clients are viewable by assigned broker or management" ON public.clients;
CREATE POLICY "clients_select_policy" ON public.clients
FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'administrativo') OR
    public.has_role(auth.uid(), 'financeiro') OR
    (public.has_role(auth.uid(), 'corretor') AND (
        broker_id = auth.uid() OR 
        id IN (SELECT client_id FROM public.policies WHERE broker_id = auth.uid())
    ))
);

CREATE POLICY "clients_insert_policy" ON public.clients
FOR INSERT TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'administrativo') OR
    (public.has_role(auth.uid(), 'corretor') AND broker_id = auth.uid())
);

CREATE POLICY "clients_update_policy" ON public.clients
FOR UPDATE TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR
    (public.has_role(auth.uid(), 'corretor') AND broker_id = auth.uid())
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR
    (public.has_role(auth.uid(), 'corretor') AND broker_id = auth.uid())
);

-- POLICIES
DROP POLICY IF EXISTS "Policies are viewable by assigned broker or management" ON public.policies;
CREATE POLICY "policies_select_policy" ON public.policies
FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'administrativo') OR
    public.has_role(auth.uid(), 'financeiro') OR
    (public.has_role(auth.uid(), 'corretor') AND broker_id = auth.uid())
);

CREATE POLICY "policies_insert_policy" ON public.policies
FOR INSERT TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'administrativo') OR
    (public.has_role(auth.uid(), 'corretor') AND broker_id = auth.uid())
);

CREATE POLICY "policies_update_policy" ON public.policies
FOR UPDATE TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR
    (public.has_role(auth.uid(), 'corretor') AND broker_id = auth.uid())
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR
    (public.has_role(auth.uid(), 'corretor') AND broker_id = auth.uid())
);
