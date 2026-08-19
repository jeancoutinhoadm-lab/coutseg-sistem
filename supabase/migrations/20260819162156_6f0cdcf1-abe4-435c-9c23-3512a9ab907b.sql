-- 1. Inserir produtos baseados no enum policy_type se não existirem
INSERT INTO public.products (name, active)
SELECT val, true
FROM (VALUES ('auto'), ('home'), ('life'), ('health'), ('business'), ('other')) AS v(val)
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = v.val);

-- 2. Migrar dados da coluna 'type' para 'product_id' na tabela policies
UPDATE public.policies p
SET product_id = pr.id
FROM public.products pr
WHERE p.type::text = pr.name
AND p.product_id IS NULL;

-- 3. Criar alguns aliases comuns para Seguradoras (Porto, SulAmerica, etc)
INSERT INTO public.insurer_aliases (insurer_id, alias)
SELECT id, 'PORTO' FROM public.insurers WHERE name ILIKE '%Porto Seguro%'
ON CONFLICT DO NOTHING;

INSERT INTO public.insurer_aliases (insurer_id, alias)
SELECT id, 'PORTOSEG' FROM public.insurers WHERE name ILIKE '%Porto Seguro%'
ON CONFLICT DO NOTHING;

-- 4. Melhorar segurança e integridade
-- Restringir delete em clients para não apagar apólices silenciosamente
-- Primeiro precisamos descobrir o nome das FKs para alterá-las
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.table_name, kcu.column_name, tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        WHERE constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'clients'
        AND tc.table_schema = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.clients(id) ON DELETE RESTRICT', 
                       r.table_name, r.constraint_name, r.column_name);
    END LOOP;
END $$;
