-- 1. Criar tabela de aliases para Seguradoras
CREATE TABLE IF NOT EXISTS public.insurer_aliases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    insurer_id uuid REFERENCES public.insurers(id) ON DELETE CASCADE,
    alias text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(alias)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurer_aliases TO authenticated;
GRANT ALL ON public.insurer_aliases TO service_role;
ALTER TABLE public.insurer_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated to read aliases" ON public.insurer_aliases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage aliases" ON public.insurer_aliases FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. Criar tabela de aliases para Produtos
CREATE TABLE IF NOT EXISTS public.product_aliases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    alias text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(alias)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_aliases TO authenticated;
GRANT ALL ON public.product_aliases TO service_role;
ALTER TABLE public.product_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated to read product aliases" ON public.product_aliases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage product aliases" ON public.product_aliases FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Adicionar product_id na tabela policies para unificar fonte de verdade
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='policies' AND column_name='product_id') THEN
        ALTER TABLE public.policies ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT;
    END IF;
END $$;
