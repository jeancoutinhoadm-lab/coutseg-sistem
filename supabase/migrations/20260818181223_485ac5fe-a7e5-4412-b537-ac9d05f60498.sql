CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    size INTEGER,
    policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all documents"
ON public.documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Brokers can manage their own documents"
ON public.documents
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.policies p
        WHERE p.id = documents.policy_id
        AND p.broker_id IN (SELECT b.id FROM public.brokers b WHERE b.user_id = auth.uid())
    )
    OR
    EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = documents.client_id
        AND c.broker_id IN (SELECT b.id FROM public.brokers b WHERE b.user_id = auth.uid())
    )
);