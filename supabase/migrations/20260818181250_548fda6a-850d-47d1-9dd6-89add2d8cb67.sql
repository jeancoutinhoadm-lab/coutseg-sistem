-- 1. Políticas de Storage para o bucket 'policy_documents'

-- Permite INSERT no bucket 'policy_documents' para usuários autenticados
CREATE POLICY "Allow authenticated uploads to policy_documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'policy_documents');

-- Permite SELECT (download) para o dono ou Admins
CREATE POLICY "Allow owners and admins to select from policy_documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'policy_documents' AND (
        auth.uid() = owner OR 
        public.has_role(auth.uid(), 'admin')
    )
);

-- Permite DELETE para o dono ou Admins
CREATE POLICY "Allow owners and admins to delete from policy_documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'policy_documents' AND (
        auth.uid() = owner OR 
        public.has_role(auth.uid(), 'admin')
    )
);
