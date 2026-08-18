-- 1. Enum para tipos de documentos processados por IA
DO $$ BEGIN
    CREATE TYPE public.document_type AS ENUM ('policy', 'bill', 'commission_report', 'proposal', 'endorsement', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela para rastreamento de processamento de IA
CREATE TABLE IF NOT EXISTS public.document_processing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
    type public.document_type,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    extracted_data jsonb,
    error_message text,
    processed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 3. Tabela de Receitas (além das comissões)
CREATE TABLE IF NOT EXISTS public.revenue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    date date NOT NULL,
    category text,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 4. Tabela de Categorias de Despesas
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 5. Tabela de Despesas
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    date date NOT NULL,
    category_id uuid REFERENCES public.expense_categories(id),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    document_id uuid REFERENCES public.documents(id),
    created_at timestamptz DEFAULT now()
);

-- 6. Tabela de Comissões (Conciliação)
CREATE TABLE IF NOT EXISTS public.commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id uuid REFERENCES public.policies(id) ON DELETE CASCADE,
    expected_amount numeric(12,2) NOT NULL,
    received_amount numeric(12,2) DEFAULT 0,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'divergent')),
    due_date date,
    received_date date,
    statement_document_id uuid REFERENCES public.documents(id),
    created_at timestamptz DEFAULT now()
);

-- 7. Tabela de Oportunidades (Cross-sell)
CREATE TABLE IF NOT EXISTS public.opportunities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    broker_id uuid REFERENCES public.brokers(id),
    status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoting', 'negotiating', 'won', 'lost', 'deferred')),
    priority text DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    score integer DEFAULT 0,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 8. Tabela de Tarefas
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    due_date timestamptz,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority text DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    user_id uuid REFERENCES auth.users(id),
    client_id uuid REFERENCES public.clients(id),
    policy_id uuid REFERENCES public.policies(id),
    opportunity_id uuid REFERENCES public.opportunities(id),
    origin text DEFAULT 'manual',
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- 9. Tabela de Funcionários e Salários
CREATE TABLE IF NOT EXISTS public.employees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    role text,
    salary numeric(12,2),
    hire_date date,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salary_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid REFERENCES public.employees(id),
    amount numeric(12,2) NOT NULL,
    payment_date date NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at timestamptz DEFAULT now()
);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- RLS
ALTER TABLE public.document_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

-- POLICIES (Simplificadas para permitir acesso inicial, depois refinamos por cargo)
CREATE POLICY "Authenticated users can manage finance" ON public.revenue FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Authenticated users can manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Authenticated users can manage tasks" ON public.tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage opportunities" ON public.opportunities FOR ALL TO authenticated USING (true);

