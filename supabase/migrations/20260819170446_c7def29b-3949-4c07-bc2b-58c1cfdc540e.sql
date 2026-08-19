-- 1. Expansão da Tabela de Tarefas
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id),
ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.documents(id),
ADD COLUMN IF NOT EXISTS commission_id uuid REFERENCES public.commissions(id),
ADD COLUMN IF NOT EXISTS payable_id uuid REFERENCES public.payables(id),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ajustar Enums de Tarefas para o padrão solicitado (maiusculo no enum do Postgres se necessário, mas mantendo compatibilidade com o CHECK existente)
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'pending', 'in_progress', 'completed', 'cancelled'));

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'low', 'medium', 'high', 'urgent', 'normal'));

-- 2. Tabela de Histórico de Tarefas (Auditoria Operacional)
CREATE TABLE IF NOT EXISTS public.task_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    field text NOT NULL,
    old_value text,
    new_value text,
    changed_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- 3. Tabela de Notificações Internas
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL, -- task_assigned, task_due, document_ready, etc.
    origin_table text,
    origin_id uuid,
    read_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 4. RLS e Grants
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.task_history TO authenticated;
GRANT ALL ON public.task_history TO service_role;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- Policies for Task History
CREATE POLICY "task_history_select" ON public.task_history FOR SELECT TO authenticated USING (true);

-- Policies for Notifications
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated 
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. Trigger para Atualização de Timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

-- 6. Trigger para Histórico de Tarefas
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO public.task_history (task_id, field, old_value, new_value, changed_by)
            VALUES (NEW.id, 'status', OLD.status, NEW.status, auth.uid());
        END IF;
        IF (OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
            INSERT INTO public.task_history (task_id, field, old_value, new_value, changed_by)
            VALUES (NEW.id, 'user_id', OLD.user_id::text, NEW.user_id::text, auth.uid());
        END IF;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.task_history (task_id, field, new_value, changed_by)
        VALUES (NEW.id, 'created', 'TASK_CREATED', auth.uid());
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

DROP TRIGGER IF EXISTS log_task_changes_trigger ON public.tasks;
CREATE TRIGGER log_task_changes_trigger
    AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE PROCEDURE public.log_task_changes();
