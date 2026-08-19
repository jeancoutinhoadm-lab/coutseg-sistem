-- 1. Corrigir políticas da tabela public.documents
-- Remover políticas antigas para evitar conflitos se necessário, ou apenas adicionar a nova
-- A política "Brokers can manage their own documents" é muito restritiva para o INSERT inicial.

-- Permitir que qualquer usuário autenticado com um cargo válido insira documentos onde ele é o dono
CREATE POLICY "Users can insert their own documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = uploaded_by OR 
    uploaded_by IS NULL -- Permite o insert inicial se o frontend ainda não setou o ID (ajustaremos o frontend para setar)
);

-- Garantir que todos os cargos operacionais possam ver seus próprios documentos ou documentos vinculados
-- Vamos simplificar a política de visualização para ser mais resiliente
DROP POLICY IF EXISTS "Brokers can manage their own documents" ON public.documents;

CREATE POLICY "Users can view their own documents"
ON public.documents
FOR SELECT
TO authenticated
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
    )
);

-- Permitir DELETE apenas para o dono ou admin
CREATE POLICY "Users can delete their own documents"
ON public.documents
FOR DELETE
TO authenticated
USING (
    auth.uid() = uploaded_by OR
    public.has_role(auth.uid(), 'admin')
);

-- 2. Garantir políticas para document_processing
-- Esta tabela também precisa permitir o fluxo da Central de Entrada
DROP POLICY IF EXISTS "Manage items" ON public.document_processing;
DROP POLICY IF EXISTS "Staff manage document processing" ON public.document_processing;

CREATE POLICY "Staff manage document processing"
ON public.document_processing
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Ajustar políticas de Storage para garantir SELECT consistente
-- Às vezes o bucket_id nas políticas de storage.objects precisa ser exato
DROP POLICY IF EXISTS "Allow authenticated uploads to policy_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners and admins to select from policy_documents" ON storage.objects;

CREATE POLICY "Allow authenticated uploads to policy_documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'policy_documents');

CREATE POLICY "Allow authenticated access to policy_documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'policy_documents');
