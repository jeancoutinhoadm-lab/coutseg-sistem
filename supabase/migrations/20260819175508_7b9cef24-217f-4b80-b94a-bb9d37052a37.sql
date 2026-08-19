-- Tabela de configurações da corretora
CREATE TABLE IF NOT EXISTS public.agency_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir dados iniciais se não existirem
INSERT INTO public.agency_settings (name, cnpj)
VALUES ('CoutSeg Corretora de Seguros', '00.000.000/0001-00')
ON CONFLICT DO NOTHING;

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.agency_settings TO authenticated;
GRANT ALL ON public.agency_settings TO service_role;

-- RLS
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem alterar
CREATE POLICY "Admins can manage agency settings"
ON public.agency_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Todos autenticados podem ler
CREATE POLICY "All users can read agency settings"
ON public.agency_settings
FOR SELECT
TO authenticated
USING (true);
