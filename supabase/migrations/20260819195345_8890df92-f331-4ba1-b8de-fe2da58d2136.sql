-- Task History
DROP POLICY IF EXISTS "task_history_select" ON public.task_history;
DROP POLICY IF EXISTS "task_history_isolation" ON public.task_history;
CREATE POLICY "task_history_isolation" ON public.task_history
FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND (
            t.user_id = auth.uid() OR 
            t.creator_id = auth.uid()
        )
    )
);

-- Operation Checklists
DROP POLICY IF EXISTS "Checklists herdados" ON public.operation_checklists;
DROP POLICY IF EXISTS "Checklists podem ser atualizados" ON public.operation_checklists;
DROP POLICY IF EXISTS "operation_checklists_isolation" ON public.operation_checklists;
CREATE POLICY "operation_checklists_isolation" ON public.operation_checklists
FOR ALL TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gerente') OR 
    EXISTS (
        SELECT 1 FROM public.operations o
        WHERE o.id = operation_id AND (
            o.created_by = auth.uid() OR 
            o.responsible_id = auth.uid()
        )
    )
);