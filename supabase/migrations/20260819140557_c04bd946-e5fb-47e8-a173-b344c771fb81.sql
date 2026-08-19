-- 1. Limpeza de políticas existentes na tabela public.documents
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.documents;
DROP POLICY IF EXISTS "Brokers can manage their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

-- 2. Novas políticas para public.documents
-- INSERT: Apenas se o uploaded_by for o próprio usuário
CREATE POLICY "documents_insert_own"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

-- SELECT: Dono, Admins/Gerentes ou via vínculo de cliente/apólice (para corretores)
CREATE POLICY "documents_select_restricted"
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

-- UPDATE/DELETE: Apenas dono ou admins
CREATE POLICY "documents_update_restricted"
ON public.documents FOR UPDATE TO authenticated
USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "documents_delete_restricted"
ON public.documents FOR DELETE TO authenticated
USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'));

-- 3. Limpeza de políticas de Storage para o bucket 'policy_documents'
DROP POLICY IF EXISTS "Allow authenticated uploads to policy_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners and admins to select from policy_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners and admins to delete from policy_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated access to policy_documents" ON storage.objects;

-- 4. Novas políticas de Storage isoladas por usuário
-- INSERT: Apenas no bucket correto e no caminho do próprio usuário
CREATE POLICY "storage_insert_own_path"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'policy_documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT: Dono (pelo path) ou Admins
CREATE POLICY "storage_select_restricted"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'policy_documents' AND 
    (
        (storage.foldername(name))[1] = auth.uid()::text OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'gerente')
    )
);

-- DELETE: Apenas dono ou Admins
CREATE POLICY "storage_delete_restricted"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'policy_documents' AND 
    (
        (storage.foldername(name))[1] = auth.uid()::text OR
        public.has_role(auth.uid(), 'admin')
    )
);
