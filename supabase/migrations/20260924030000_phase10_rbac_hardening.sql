-- Fase 10: remover policies amplas remanescentes e aplicar RBAC por função.
-- Não altera nem remove dados existentes.

-- Cadastros administrativos: todos autenticados podem consultar referências;
-- apenas Admin e Gerente podem alterar o catálogo/equipe.
DROP POLICY IF EXISTS "Authenticated users can manage brokers" ON public.brokers;
DROP POLICY IF EXISTS "brokers_select_rbac" ON public.brokers;
DROP POLICY IF EXISTS "brokers_manage_rbac" ON public.brokers;
CREATE POLICY "brokers_select_rbac" ON public.brokers FOR SELECT TO authenticated USING (true);
CREATE POLICY "brokers_manage_rbac" ON public.brokers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

DROP POLICY IF EXISTS "Authenticated users can manage insurers" ON public.insurers;
DROP POLICY IF EXISTS "insurers_select_rbac" ON public.insurers;
DROP POLICY IF EXISTS "insurers_manage_rbac" ON public.insurers;
CREATE POLICY "insurers_select_rbac" ON public.insurers FOR SELECT TO authenticated USING (true);
CREATE POLICY "insurers_manage_rbac" ON public.insurers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
DROP POLICY IF EXISTS "products_select_rbac" ON public.products;
DROP POLICY IF EXISTS "products_manage_rbac" ON public.products;
CREATE POLICY "products_select_rbac" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_manage_rbac" ON public.products FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

DROP POLICY IF EXISTS "cross_sell_rules_select_rbac" ON public.cross_sell_rules;
DROP POLICY IF EXISTS "cross_sell_rules_manage_rbac" ON public.cross_sell_rules;
CREATE POLICY "cross_sell_rules_select_rbac" ON public.cross_sell_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "cross_sell_rules_manage_rbac" ON public.cross_sell_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

-- Sinistros: financeiro consulta; gestão/administrativo trabalham a carteira;
-- corretor só acessa sinistros de suas próprias apólices.
DROP POLICY IF EXISTS "Authenticated users can manage claims" ON public.claims;
DROP POLICY IF EXISTS "claims_select_rbac" ON public.claims;
DROP POLICY IF EXISTS "claims_manage_rbac" ON public.claims;
CREATE POLICY "claims_select_rbac" ON public.claims FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR
  public.has_role(auth.uid(), 'administrativo') OR public.has_role(auth.uid(), 'financeiro') OR
  EXISTS (SELECT 1 FROM public.policies p JOIN public.brokers b ON b.id = p.broker_id WHERE p.id = policy_id AND b.user_id = auth.uid())
);
CREATE POLICY "claims_manage_rbac" ON public.claims FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo') OR
  EXISTS (SELECT 1 FROM public.policies p JOIN public.brokers b ON b.id = p.broker_id WHERE p.id = policy_id AND b.user_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo') OR
  EXISTS (SELECT 1 FROM public.policies p JOIN public.brokers b ON b.id = p.broker_id WHERE p.id = policy_id AND b.user_id = auth.uid())
);

-- CRM: corretor fica limitado à própria carteira; gestão e administrativo
-- atendem a operação comercial. Financeiro não altera registros comerciais.
DROP POLICY IF EXISTS "leads_isolation" ON public.leads;
DROP POLICY IF EXISTS "crm_activities_isolation" ON public.crm_activities;
DROP POLICY IF EXISTS "quotes_isolation" ON public.quotes;
CREATE POLICY "leads_isolation" ON public.leads FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo') OR
  (public.has_role(auth.uid(), 'corretor') AND broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()))
) WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo') OR
  (public.has_role(auth.uid(), 'corretor') AND broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid()))
);
CREATE POLICY "crm_activities_isolation" ON public.crm_activities FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo') OR
  EXISTS (SELECT 1 FROM public.opportunities o JOIN public.brokers b ON b.id = o.broker_id WHERE o.id = opportunity_id AND b.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.leads l JOIN public.brokers b ON b.id = l.broker_id WHERE l.id = lead_id AND b.user_id = auth.uid())
) WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo') OR
  EXISTS (SELECT 1 FROM public.opportunities o JOIN public.brokers b ON b.id = o.broker_id WHERE o.id = opportunity_id AND b.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.leads l JOIN public.brokers b ON b.id = l.broker_id WHERE l.id = lead_id AND b.user_id = auth.uid())
);
CREATE POLICY "quotes_isolation" ON public.quotes FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo') OR
  EXISTS (SELECT 1 FROM public.opportunities o JOIN public.brokers b ON b.id = o.broker_id WHERE o.id = opportunity_id AND b.user_id = auth.uid())
) WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo') OR
  EXISTS (SELECT 1 FROM public.opportunities o JOIN public.brokers b ON b.id = o.broker_id WHERE o.id = opportunity_id AND b.user_id = auth.uid())
);

-- Tarefas: não manter a policy histórica FOR ALL USING (true). Cada pessoa
-- controla as próprias tarefas; gestão e administrativo atendem a equipe.
DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_rbac" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_rbac" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_rbac" ON public.tasks;
CREATE POLICY "tasks_select_rbac" ON public.tasks FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo') OR
  user_id = auth.uid() OR creator_id = auth.uid()
);
CREATE POLICY "tasks_insert_rbac" ON public.tasks FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo') OR
  (user_id = auth.uid() AND creator_id = auth.uid())
);
CREATE POLICY "tasks_update_rbac" ON public.tasks FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo') OR
  user_id = auth.uid() OR creator_id = auth.uid()
) WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'administrativo') OR
  (user_id = auth.uid() AND creator_id = auth.uid())
);

REVOKE DELETE ON public.brokers, public.insurers, public.products, public.cross_sell_rules, public.claims, public.leads, public.quotes, public.crm_activities, public.tasks FROM authenticated;
