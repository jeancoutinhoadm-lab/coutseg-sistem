CREATE TYPE public.operation_type AS ENUM ('new_sale', 'renewal', 'endorsement', 'cancellation', 'update');
CREATE TYPE public.operation_status AS ENUM ('draft', 'in_progress', 'pending_docs', 'review', 'completed', 'cancelled');

CREATE TABLE public.operations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type operation_type NOT NULL,
    status operation_status NOT NULL DEFAULT 'draft',
    client_id uuid REFERENCES public.clients(id),
    policy_id uuid REFERENCES public.policies(id),
    previous_policy_id uuid REFERENCES public.policies(id),
    responsible_id uuid REFERENCES auth.users(id),
    title text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE public.operation_checklists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id uuid REFERENCES public.operations(id) ON DELETE CASCADE,
    task_name text NOT NULL,
    is_completed boolean DEFAULT false,
    required boolean DEFAULT true,
    completed_at timestamptz,
    completed_by uuid REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_checklists ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operations TO authenticated;
GRANT ALL ON public.operations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_checklists TO authenticated;
GRANT ALL ON public.operation_checklists TO service_role;

-- Policies for operations
CREATE POLICY "Corretores podem ver suas operações"
ON public.operations
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'gerente') OR 
  created_by = auth.uid() OR 
  responsible_id = auth.uid()
);

CREATE POLICY "Corretores podem criar operações"
ON public.operations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Corretores podem atualizar suas operações"
ON public.operations
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'gerente') OR 
  created_by = auth.uid() OR 
  responsible_id = auth.uid()
);

-- Policies for checklists
CREATE POLICY "Checklists herdados"
ON public.operation_checklists
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.operations 
    WHERE id = operation_id
  )
);

CREATE POLICY "Checklists podem ser criados"
ON public.operation_checklists
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Checklists podem ser atualizados"
ON public.operation_checklists
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.operations 
    WHERE id = operation_id
  )
);
