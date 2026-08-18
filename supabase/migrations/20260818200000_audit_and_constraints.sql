-- Refinar as constraints e garantir que o banco não aceite dados nulos onde a IA deve preencher
ALTER TABLE public.clients ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE public.policies ALTER COLUMN policy_number SET NOT NULL;
ALTER TABLE public.commissions ALTER COLUMN expected_amount SET NOT NULL;

-- Trigger para criar comissão prevista ao criar apólice
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

-- Trigger para auditoria automática em mudanças financeiras
CREATE OR REPLACE FUNCTION public.audit_financial_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity, record_id, old_data, new_data)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        to_jsonb(OLD),
        to_jsonb(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_commissions_trigger ON public.commissions;
CREATE TRIGGER audit_commissions_trigger
    AFTER UPDATE OR DELETE ON public.commissions
    FOR EACH ROW EXECUTE FUNCTION public.audit_financial_changes();

