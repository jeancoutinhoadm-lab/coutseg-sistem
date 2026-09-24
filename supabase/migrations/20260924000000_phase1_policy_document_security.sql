-- Phase 1: regulariza policies permissivas detectadas no banco remoto.
-- Esta migration não remove nem altera dados, objetos de Storage ou tabelas.
-- O bucket policy_documents já existe, permanece privado e recebe limites para novos uploads.

-- O estado remoto confirmou limites nulos. Esta atualização protege apenas novos
-- uploads; arquivos existentes não são removidos nem modificados.
UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
WHERE id = 'policy_documents';

-- RLS não se aplica a TRUNCATE. A leitura remota mostrou esse privilégio para
-- roles de aplicação; removê-lo impede apagamento em massa sem tocar nos dados.
REVOKE TRUNCATE ON public.documents, public.policies FROM anon, authenticated;
-- A API pública não oferece exclusão física de apólices.
REVOKE DELETE ON public.policies FROM authenticated;

-- Remove policies manuais permissivas que, por serem PERMISSIVE, anulam as
-- policies restritivas v3 existentes em public.documents.
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;
DROP POLICY IF EXISTS "Soft delete protection" ON public.documents;

-- As policies documents_*_v3, já presentes no banco, continuam sendo a fonte
-- de autorização para metadata: uploader, administração e vínculo com a apólice.

-- Remove policies amplas de Storage. As policies v3 são substituídas para
-- suportar o namespace <auth.uid()>/<policy_id>/<arquivo>, inclusive em uploads
-- cujo metadata ainda não foi gravado em public.documents.
DROP POLICY IF EXISTS "Authenticated users can delete policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view policy documents" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert_own_path_v3" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_isolated_v3" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_isolated_v3" ON storage.objects;

CREATE POLICY "storage_insert_policy_documents_v4"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'policy_documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "storage_select_policy_documents_v4"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'policy_documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gerente')
    OR EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.file_path = name
        AND (
          d.uploaded_by = auth.uid()
          OR public.has_role(auth.uid(), 'administrativo')
          OR public.has_role(auth.uid(), 'financeiro')
          OR EXISTS (
            SELECT 1
            FROM public.policies p
            JOIN public.brokers b ON b.id = p.broker_id
            WHERE p.id = d.policy_id
              AND b.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.clients c
            JOIN public.brokers b ON b.id = c.broker_id
            WHERE c.id = d.client_id
              AND b.user_id = auth.uid()
          )
        )
    )
  )
);

CREATE POLICY "storage_delete_policy_documents_v4"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'policy_documents'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Consolida a autorização de apólices e elimina DELETE físico via API pública.
-- SELECT continua em policies_select, que já contém o vínculo correto broker -> user_id.
DROP POLICY IF EXISTS "policies_manage" ON public.policies;
DROP POLICY IF EXISTS "policies_insert_policy" ON public.policies;
DROP POLICY IF EXISTS "policies_update_policy" ON public.policies;
DROP POLICY IF EXISTS "policies_select_policy" ON public.policies;

CREATE POLICY "policies_insert_v4"
ON public.policies FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gerente')
  OR public.has_role(auth.uid(), 'administrativo')
  OR (
    public.has_role(auth.uid(), 'corretor')
    AND broker_id IN (
      SELECT id FROM public.brokers WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "policies_update_v4"
ON public.policies FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gerente')
  OR public.has_role(auth.uid(), 'administrativo')
  OR (
    public.has_role(auth.uid(), 'corretor')
    AND broker_id IN (
      SELECT id FROM public.brokers WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gerente')
  OR public.has_role(auth.uid(), 'administrativo')
  OR (
    public.has_role(auth.uid(), 'corretor')
    AND broker_id IN (
      SELECT id FROM public.brokers WHERE user_id = auth.uid()
    )
  )
);
