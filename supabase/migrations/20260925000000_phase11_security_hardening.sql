-- Phase 11: security hardening. This migration only changes authorization and
-- adds a bounded AI-usage counter; it does not delete or rewrite business data.

-- New Supabase Auth accounts remain represented by a profile, but receive no
-- application role. Access is granted only by an administrator through user_roles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'pending')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Per-user, database-enforced AI quota. The function uses auth.uid(), never a
-- caller supplied user id, and serializes concurrent requests for the same user.
CREATE TABLE IF NOT EXISTS public.ai_request_windows (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_request_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_request_windows FROM anon, authenticated;
GRANT ALL ON public.ai_request_windows TO service_role;

CREATE OR REPLACE FUNCTION public.consume_ai_request_quota()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_started_at timestamptz;
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  INSERT INTO public.ai_request_windows (user_id, window_started_at, request_count)
  VALUES (v_user_id, now(), 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT window_started_at, request_count
    INTO v_started_at, v_count
  FROM public.ai_request_windows
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_started_at < now() - interval '1 hour' THEN
    UPDATE public.ai_request_windows
    SET window_started_at = now(), request_count = 1, updated_at = now()
    WHERE user_id = v_user_id;
    RETURN true;
  END IF;

  IF v_count >= 10 THEN
    RETURN false;
  END IF;

  UPDATE public.ai_request_windows
  SET request_count = request_count + 1, updated_at = now()
  WHERE user_id = v_user_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_request_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_request_quota() TO authenticated, service_role;

-- Prevent an unassigned Auth account from using the document namespace and
-- prevent a broker from attaching a document to another broker's records.
DROP POLICY IF EXISTS "documents_insert_own" ON public.documents;
DROP POLICY IF EXISTS "documents_select_restricted" ON public.documents;
DROP POLICY IF EXISTS "documents_update_restricted" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_restricted" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_own_v3" ON public.documents;
DROP POLICY IF EXISTS "documents_select_restricted_v3" ON public.documents;
DROP POLICY IF EXISTS "documents_update_restricted_v3" ON public.documents;

CREATE POLICY "documents_insert_secure_v5" ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND split_part(file_path, '/', 1) = auth.uid()::text
  AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'administrativo') OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'corretor')
  )
  AND (policy_id IS NULL OR NOT public.has_role(auth.uid(), 'corretor') OR EXISTS (
    SELECT 1 FROM public.policies p JOIN public.brokers b ON b.id = p.broker_id
    WHERE p.id = documents.policy_id AND b.user_id = auth.uid()
  ))
  AND (client_id IS NULL OR NOT public.has_role(auth.uid(), 'corretor') OR EXISTS (
    SELECT 1 FROM public.clients c JOIN public.brokers b ON b.id = c.broker_id
    WHERE c.id = documents.client_id AND b.user_id = auth.uid()
  ))
);

CREATE POLICY "documents_select_secure_v5" ON public.documents
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')
  OR public.has_role(auth.uid(), 'administrativo') OR public.has_role(auth.uid(), 'financeiro')
  OR (public.has_role(auth.uid(), 'corretor') AND (
    uploaded_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.policies p JOIN public.brokers b ON b.id = p.broker_id
      WHERE p.id = documents.policy_id AND b.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.clients c JOIN public.brokers b ON b.id = c.broker_id
      WHERE c.id = documents.client_id AND b.user_id = auth.uid()
    )
  ))
);

CREATE POLICY "documents_update_secure_v5" ON public.documents
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')
  OR public.has_role(auth.uid(), 'administrativo')
  OR (public.has_role(auth.uid(), 'corretor') AND uploaded_by = auth.uid())
)
WITH CHECK (
  split_part(file_path, '/', 1) = uploaded_by::text
  AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'administrativo')
    OR (public.has_role(auth.uid(), 'corretor') AND uploaded_by = auth.uid()
      AND (policy_id IS NULL OR EXISTS (
        SELECT 1 FROM public.policies p JOIN public.brokers b ON b.id = p.broker_id
        WHERE p.id = documents.policy_id AND b.user_id = auth.uid()
      ))
      AND (client_id IS NULL OR EXISTS (
        SELECT 1 FROM public.clients c JOIN public.brokers b ON b.id = c.broker_id
        WHERE c.id = documents.client_id AND b.user_id = auth.uid()
      )))
  )
);

REVOKE DELETE, TRUNCATE ON public.documents FROM authenticated;

DROP POLICY IF EXISTS "storage_insert_policy_documents_v4" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_policy_documents_v4" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_policy_documents_v4" ON storage.objects;

CREATE POLICY "storage_insert_policy_documents_v5" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'policy_documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'administrativo') OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'corretor'))
);

CREATE POLICY "storage_select_policy_documents_v5" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'policy_documents' AND EXISTS (
    SELECT 1 FROM public.documents d WHERE d.file_path = name
  )
);

-- Close direct object deletion for the application API. Document retention is
-- logical; Storage cleanup, if ever needed, must be a controlled admin process.
REVOKE DELETE ON storage.objects FROM authenticated;

-- Replace permissive operations/checklists policies that permitted arbitrary
-- inserts and checklist access by guessed identifiers.
DROP POLICY IF EXISTS "Corretores podem ver suas operações" ON public.operations;
DROP POLICY IF EXISTS "Corretores podem criar operações" ON public.operations;
DROP POLICY IF EXISTS "Corretores podem atualizar suas operações" ON public.operations;
DROP POLICY IF EXISTS "Checklists podem ser criados" ON public.operation_checklists;
DROP POLICY IF EXISTS "operation_checklists_isolation" ON public.operation_checklists;

CREATE POLICY "operations_select_secure_v5" ON public.operations
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')
  OR public.has_role(auth.uid(), 'administrativo')
  OR (public.has_role(auth.uid(), 'corretor') AND (created_by = auth.uid() OR responsible_id = auth.uid()))
);

CREATE POLICY "operations_insert_secure_v5" ON public.operations
FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')
  OR public.has_role(auth.uid(), 'administrativo')
  OR (public.has_role(auth.uid(), 'corretor') AND created_by = auth.uid()
      AND (responsible_id IS NULL OR responsible_id = auth.uid()))
);

CREATE POLICY "operations_update_secure_v5" ON public.operations
FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')
  OR public.has_role(auth.uid(), 'administrativo')
  OR (public.has_role(auth.uid(), 'corretor') AND (created_by = auth.uid() OR responsible_id = auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente')
  OR public.has_role(auth.uid(), 'administrativo')
  OR (public.has_role(auth.uid(), 'corretor') AND created_by = auth.uid()
      AND (responsible_id IS NULL OR responsible_id = auth.uid()))
);

CREATE POLICY "operation_checklists_secure_v5" ON public.operation_checklists
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.operations o WHERE o.id = operation_id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.operations o WHERE o.id = operation_id)
);

REVOKE DELETE, TRUNCATE ON public.operations, public.operation_checklists FROM authenticated;

-- Keep the audit trail useful without retaining a second copy of extracted PII.
CREATE OR REPLACE FUNCTION public.approve_document_extraction(_processing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_doc_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'administrativo')) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;
  SELECT document_id INTO v_doc_id FROM public.document_processing
  WHERE id = _processing_id AND extracted_data IS NOT NULL;
  IF v_doc_id IS NULL THEN RAISE EXCEPTION 'Extração não encontrada.'; END IF;
  UPDATE public.document_processing SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _processing_id;
  INSERT INTO public.audit_logs (action, entity, record_id, user_id, new_data)
  VALUES ('EXTRACTION_APPROVED', 'document_processing', _processing_id, auth.uid(),
          jsonb_build_object('document_id', v_doc_id, 'status', 'approved'));
END;
$$;
REVOKE ALL ON FUNCTION public.approve_document_extraction(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_document_extraction(uuid) TO authenticated, service_role;
