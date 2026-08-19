-- Corrigir calculate_policy_priority (Search path mutable) se ressurgiu ou faltou
ALTER FUNCTION public.calculate_policy_priority(date) SET search_path = public;

-- Garantir que a nova função handle_updated_at também tenha search_path
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
