-- Fase 6: preservar o histórico de sinistros sem remover registros existentes.
-- A coluna é adicional e a migration pode ser executada uma única vez com
-- segurança mesmo se o ambiente já tiver recebido a alteração manualmente.
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS claims_active_created_at_idx
  ON public.claims (created_at DESC)
  WHERE deleted_at IS NULL;
