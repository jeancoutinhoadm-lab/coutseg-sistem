-- Remove policies legadas que permaneceram permissivas por coexistirem com
-- as políticas RBAC da Fase 10. Não altera registros.
DROP POLICY IF EXISTS "Users manage own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins and managers manage all tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
