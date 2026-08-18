-- 1. Criar tabela de produtos
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Grants para produtos
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

-- 3. Habilitar RLS para produtos
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para produtos
CREATE POLICY "Admins can manage products" 
ON public.products FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated can view active products" 
ON public.products FOR SELECT TO authenticated 
USING (active = true);

-- 5. Atualizar tabela de clientes
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('PF', 'PJ')) DEFAULT 'PF',
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect'));

-- 6. Adicionar constraint UNIQUE para CPF/CNPJ (após limpar duplicatas se houver, mas como é um projeto novo/em desenvolvimento, assumimos que podemos aplicar)
-- Nota: Em um banco real, precisaríamos de um script de limpeza antes.
ALTER TABLE public.clients ADD CONSTRAINT clients_cpf_cnpj_key UNIQUE (cpf_cnpj);

-- 7. Inserir alguns produtos iniciais
INSERT INTO public.products (name) VALUES 
('Auto'), ('Residencial'), ('Vida'), ('Empresarial'), ('Condomínio'), 
('Viagem'), ('Rural'), ('Previdência'), ('Fiança')
ON CONFLICT (name) DO NOTHING;
