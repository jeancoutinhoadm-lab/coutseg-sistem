
-- Lote 1 & 2: Reforço de RLS para Documents, Storage e Document Processing

-- Limpeza de políticas redundantes ou inseguras no Storage
DROP POLICY IF EXISTS "Allow authenticated access to policy_documents" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert_own_path" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_restricted" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_restricted" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert_own_path_v2" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_isolated_v2" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_isolated_v2" ON storage.objects;

-- 1. INSERT no Storage: Apenas no bucket correto e dentro do path do próprio usuário
CREATE POLICY "storage_insert_own_path_v3"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'policy_documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. SELECT no Storage: Apenas dono do path OU Admin/Gerente
CREATE POLICY "storage_select_isolated_v3"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'policy_documents' AND 
    (
        (storage.foldername(name))[1] = auth.uid()::text OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'gerente')
    )
);

-- 3. DELETE no Storage: Apenas dono do path OU Admin
CREATE POLICY "storage_delete_isolated_v3"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'policy_documents' AND 
    (
        (storage.foldername(name))[1] = auth.uid()::text OR
        public.has_role(auth.uid(), 'admin')
    )
);

-- 4. Proteção da tabela public.documents
DROP POLICY IF EXISTS "documents_insert_own" ON public.documents;
DROP POLICY IF EXISTS "documents_select_restricted" ON public.documents;
DROP POLICY IF EXISTS "documents_update_restricted" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_restricted" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_v2" ON public.documents;
DROP POLICY IF EXISTS "documents_select_v2" ON public.documents;
DROP POLICY IF EXISTS "documents_update_v2" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_v2" ON public.documents;

CREATE POLICY "documents_insert_v3"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "documents_select_v3"
ON public.documents FOR SELECT TO authenticated
USING (
    auth.uid() = uploaded_by OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'administrativo') OR
    public.has_role(auth.uid(), 'financeiro') OR
    EXISTS (
        SELECT 1 FROM public.policies p
        WHERE p.id = documents.policy_id
        AND p.broker_id IN (SELECT b.id FROM public.brokers b WHERE b.user_id = auth.uid())
    ) OR
    EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = documents.client_id
        AND c.broker_id IN (SELECT b.id FROM public.brokers b WHERE b.user_id = auth.uid())
    )
);

-- Bloqueio IDOR em Update: Apenas dono ou admin
CREATE POLICY "documents_update_v3"
ON public.documents FOR UPDATE TO authenticated
USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "documents_delete_v3"
ON public.documents FOR DELETE TO authenticated
USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'));

-- 5. Proteção da tabela document_processing
DROP POLICY IF EXISTS "document_processing_select_refined" ON public.document_processing;
DROP POLICY IF EXISTS "document_processing_manage_refined" ON public.document_processing;
DROP POLICY IF EXISTS "document_processing_select_v2" ON public.document_processing;
DROP POLICY IF EXISTS "document_processing_manage_v2" ON public.document_processing;

CREATE POLICY "document_processing_select_v3"
ON public.document_processing FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.id = document_processing.document_id
        AND (
            d.uploaded_by = auth.uid() OR
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'gerente') OR
            public.has_role(auth.uid(), 'administrativo') OR
            public.has_role(auth.uid(), 'financeiro')
        )
    )
);

CREATE POLICY "document_processing_manage_v3"
ON public.document_processing FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.id = document_processing.document_id
        AND (
            d.uploaded_by = auth.uid() OR
            public.has_role(auth.uid(), 'admin')
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.id = document_processing.document_id
        AND (
            d.uploaded_by = auth.uid() OR
            public.has_role(auth.uid(), 'admin')
        )
    )
);

-- Lote 3: Segurança de Identidade (user_roles e has_role)

-- Revogar SELECT amplo e limitar ao próprio usuário
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;

CREATE POLICY "user_roles_select_v3"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Garantir search_path e segurança na função has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
