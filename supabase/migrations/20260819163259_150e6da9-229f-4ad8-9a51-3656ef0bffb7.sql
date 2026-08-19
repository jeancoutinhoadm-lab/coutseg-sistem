-- 1. Tipos e Enums
DO $$ BEGIN
    CREATE TYPE public.financial_entry_type AS ENUM ('income', 'expense', 'transfer', 'adjustment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.financial_status AS ENUM ('pending', 'approved', 'paid', 'received', 'partial', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Categorias Financeiras
CREATE TABLE IF NOT EXISTS public.financial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type public.financial_entry_type NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(name, type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT ALL ON public.financial_categories TO service_role;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.financial_categories
    FOR ALL TO authenticated USING (true);

-- 3. Centros de Custo
CREATE TABLE IF NOT EXISTS public.cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_centers TO authenticated;
GRANT ALL ON public.cost_centers TO service_role;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.cost_centers
    FOR ALL TO authenticated USING (true);

-- 4. Contas Bancárias (Evolução da bank_accounts existente)
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS institution TEXT;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(15,2) DEFAULT 0;

-- 5. Contas a Pagar (Payables)
CREATE TABLE IF NOT EXISTS public.payables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    due_date DATE NOT NULL,
    competence_date DATE NOT NULL,
    category_id UUID REFERENCES public.financial_categories(id) ON DELETE RESTRICT,
    cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
    status public.financial_status DEFAULT 'pending',
    recurrence_rule TEXT,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payables TO authenticated;
GRANT ALL ON public.payables TO service_role;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Financeiro total access payables" ON public.payables
    FOR ALL TO authenticated 
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- 6. Lançamentos Financeiros (Fluxo de Caixa / Financial Entries)
CREATE TABLE IF NOT EXISTS public.financial_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type public.financial_entry_type NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    entry_date DATE NOT NULL,
    bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.financial_categories(id) ON DELETE RESTRICT,
    cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
    payable_id UUID REFERENCES public.payables(id) ON DELETE SET NULL,
    commission_receipt_id UUID REFERENCES public.commission_receipts(id) ON DELETE SET NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    reference_number TEXT,
    notes TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_entries TO authenticated;
GRANT ALL ON public.financial_entries TO service_role;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Financeiro total access financial_entries" ON public.financial_entries
    FOR ALL TO authenticated 
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- Seed de Categorias Básicas
INSERT INTO public.financial_categories (name, type) VALUES
('Comissão de Seguros', 'income'),
('Outras Receitas', 'income'),
('Aluguel', 'expense'),
('Energia Elétrica', 'expense'),
('Água', 'expense'),
('Internet/Telefone', 'expense'),
('Salários', 'expense'),
('Encargos Sociais', 'expense'),
('Impostos', 'expense'),
('Marketing', 'expense'),
('Manutenção', 'expense'),
('Contador', 'expense'),
('Limpeza', 'expense'),
('Sistemas/Software', 'expense'),
('Transferência entre Contas', 'transfer'),
('Ajuste de Saldo', 'adjustment')
ON CONFLICT (name, type) DO NOTHING;

-- Seed de Centros de Custo Básicos
INSERT INTO public.cost_centers (name) VALUES
('Administrativo'),
('Comercial'),
('Operacional'),
('Marketing')
ON CONFLICT (name) DO NOTHING;
