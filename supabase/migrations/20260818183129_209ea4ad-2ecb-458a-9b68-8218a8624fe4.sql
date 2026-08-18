-- 1. Trigger para criar comissão prevista ao criar apólice
CREATE OR REPLACE FUNCTION public.create_initial_commission()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.commissions (policy_id, expected_amount, status)
    VALUES (NEW.id, COALESCE(NEW.commission_amount, 0), 'pending');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_policy_created ON public.policies;
CREATE TRIGGER on_policy_created
    AFTER INSERT ON public.policies
    FOR EACH ROW
    EXECUTE FUNCTION public.create_initial_commission();

-- 2. Trigger para auditoria automática
CREATE OR REPLACE FUNCTION public.audit_financial_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity, record_id, old_data, new_data)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_commissions_trigger ON public.commissions;
CREATE TRIGGER audit_commissions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.commissions
    FOR EACH ROW EXECUTE FUNCTION public.audit_financial_changes();

DROP TRIGGER IF EXISTS audit_expenses_trigger ON public.expenses;
CREATE TRIGGER audit_expenses_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.audit_financial_changes();

GRANT ALL ON public.commissions TO authenticated;
GRANT ALL ON public.expenses TO authenticated;
GRANT ALL ON public.audit_logs TO authenticated;
