-- Auditoria de permissões detalhada para documentos e storage
-- SELECT * FROM pg_policies WHERE tablename = 'documents'; -- Confirmar políticas atuais

-- 1. Criar política de INSERT para documents que não dependa de apólice/cliente prévio
-- O erro era que a política anterior exigia que a apólice já existisse
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert their own documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = uploaded_by
);

-- 2. Refinar política de SELECT para ser abrangente para cargos operacionais
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents"
ON public.documents
FOR SELECT
TO authenticated
USING (
    auth.uid() = uploaded_by OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'gerente') OR
    public.has_role(auth.uid(), 'administrativo') OR
    public.has_role(auth.uid(), 'financeiro')
);

-- 3. Garantir que o bucket storage esteja com RLS correto
-- O bucket policy_documents deve permitir INSERT para qualquer autenticado
-- e SELECT conforme a lógica do app.
DROP POLICY IF EXISTS "Allow authenticated uploads to policy_documents" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to policy_documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'policy_documents');

DROP POLICY IF EXISTS "Allow authenticated access to policy_documents" ON storage.objects;
CREATE POLICY "Allow authenticated access to policy_documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'policy_documents');
