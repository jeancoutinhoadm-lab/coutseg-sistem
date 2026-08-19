-- 1. Melhorar a tabela documents para Gestão Documental Completa
DO $$
BEGIN
    -- Adicionar colunas de metadados se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='mime_type') THEN
        ALTER TABLE public.documents ADD COLUMN mime_type text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='metadata') THEN
        ALTER TABLE public.documents ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='deleted_at') THEN
        ALTER TABLE public.documents ADD COLUMN deleted_at timestamptz;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='insurer_id') THEN
        ALTER TABLE public.documents ADD COLUMN insurer_id uuid REFERENCES public.insurers(id) ON DELETE RESTRICT;
    END IF;

    -- Ajustar policy_id para RESTRICT (proteger histórico)
    ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_policy_id_fkey;
    ALTER TABLE public.documents ADD CONSTRAINT documents_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id) ON DELETE RESTRICT;

    -- Garantir que file_hash seja UNIQUE para evitar duplicidade real (SHA-256)
    -- Primeiro removemos duplicatas se existirem (mantendo a mais recente)
    DELETE FROM public.documents a USING public.documents b 
    WHERE a.id < b.id AND a.file_hash = b.file_hash AND a.file_hash IS NOT NULL;
    
    ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_file_hash_key;
    ALTER TABLE public.documents ADD CONSTRAINT documents_file_hash_key UNIQUE (file_hash);

END $$;

-- 2. Grant de permissões para novos campos
GRANT SELECT, INSERT, UPDATE ON public.documents TO authenticated;

-- 3. Trigger para updated_at (se não existir)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_updated_at ON public.documents;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 4. RLS Refined: Soft Delete
CREATE POLICY "Soft delete protection" ON public.documents 
FOR SELECT TO authenticated 
USING (deleted_at IS NULL OR has_role(auth.uid(), 'admin'));
