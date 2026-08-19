-- 1. Evolução do enum document_type para incluir commission_report se não existir
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'document_type' AND n.nspname = 'public') THEN
        CREATE TYPE public.document_type AS ENUM ('policy', 'bill', 'commission_report', 'proposal', 'endorsement', 'other');
    ELSE
        -- Tentar adicionar commission_report se o enum já existir mas não o tiver
        BEGIN
            ALTER TYPE public.document_type ADD VALUE 'commission_report';
        EXCEPTION
            WHEN duplicate_object THEN null;
        END;
    END IF;
END $$;

-- 2. Atualizar document_processing para suportar o novo fluxo
DO $$ 
BEGIN
    -- Adicionar colunas de rastreabilidade e IA
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_processing' AND column_name='ai_model') THEN
        ALTER TABLE public.document_processing ADD COLUMN ai_model text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_processing' AND column_name='ai_prompt_version') THEN
        ALTER TABLE public.document_processing ADD COLUMN ai_prompt_version text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_processing' AND column_name='ai_confidence') THEN
        ALTER TABLE public.document_processing ADD COLUMN ai_confidence jsonb DEFAULT '{}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_processing' AND column_name='attempts') THEN
        ALTER TABLE public.document_processing ADD COLUMN attempts integer DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_processing' AND column_name='reviewed_by') THEN
        ALTER TABLE public.document_processing ADD COLUMN reviewed_by uuid REFERENCES auth.users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_processing' AND column_name='reviewed_at') THEN
        ALTER TABLE public.document_processing ADD COLUMN reviewed_at timestamptz;
    END IF;

    -- Atualizar constraint de status para o novo fluxo
    ALTER TABLE public.document_processing DROP CONSTRAINT IF EXISTS document_processing_status_check;
    ALTER TABLE public.document_processing ADD CONSTRAINT document_processing_status_check 
        CHECK (status IN ('pending', 'processing', 'extracted', 'needs_review', 'approved', 'rejected', 'failed'));
END $$;

-- 3. Refinar RLS para document_processing
DROP POLICY IF EXISTS "document_processing_select" ON public.document_processing;
DROP POLICY IF EXISTS "document_processing_manage" ON public.document_processing;

CREATE POLICY "document_processing_select_refined" ON public.document_processing FOR SELECT TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    public.has_role(auth.uid(), 'administrativo') OR 
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_processing.document_id AND d.uploaded_by = auth.uid())
);

CREATE POLICY "document_processing_update_auth" ON public.document_processing FOR UPDATE TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'administrativo')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'administrativo')
);

-- 4. Função para Aprovação Humana (Base para o futuro)
CREATE OR REPLACE FUNCTION public.approve_document_extraction(_processing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_data jsonb;
    v_type public.document_type;
    v_doc_id uuid;
BEGIN
    -- Verificar permissões
    IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'administrativo')) THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem aprovar extrações.';
    END IF;

    SELECT extracted_data, type, document_id INTO v_data, v_type, v_doc_id
    FROM public.document_processing
    WHERE id = _processing_id;

    IF v_data IS NULL THEN
        RAISE EXCEPTION 'Nenhum dado extraído para aprovar.';
    END IF;

    -- Nesta Etapa 7, apenas marcamos como aprovado e auditamos.
    -- A integração real com tabelas principais virá na etapa de "Digitação Mínima".
    
    UPDATE public.document_processing
    SET 
        status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = _processing_id;

    -- Log de Auditoria
    INSERT INTO public.audit_logs (action, entity, record_id, user_id, new_data)
    VALUES ('EXTRACTION_APPROVED', 'document_processing', _processing_id, auth.uid(), v_data);

END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_document_extraction(uuid) TO authenticated;
