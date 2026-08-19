# Auditoria e Correção Crítica — RLS + Estabilização Pós-Login

Este plano visa diagnosticar e corrigir o erro de carregamento pós-login ("This page didn't load") e sanar 7 vulnerabilidades CRÍTICAS de RLS detectadas no ambiente de produção, respeitando o modelo de autorização da CoutSeg (Corretor isolado em sua carteira).

## Diagnóstico e Estabilização (Pós-Login)
1. **Identificação da Falha:** Investigar o erro 500/403 no carregamento do Dashboard.
2. **Proteção de Loaders:** Garantir que queries no `loader` das rotas ou componentes de layout (`NotificationBell`, `TaskCounter`) não quebrem a aplicação caso o RLS negue acesso ou o perfil demore a carregar.
3. **Motor de Insights:** Ajustar `runDeterministicInsights` para lidar graciosamente com falhas de permissão.

## Correção de Vulnerabilidades CRÍTICAS (RLS)
1. **CRM Activities:** Restringir `crm_activities` para que o Corretor veja apenas logs de suas oportunidades/leads.
2. **CRM Change History:** Isolar o histórico de alterações baseado na entidade original (Lead/Oportunidade).
3. **Quotes:** Garantir que cotações sejam visíveis apenas para o corretor responsável pela oportunidade.
4. **Task History:** Isolar histórico de tarefas conforme acesso à tarefa pai.
5. **Operation Checklists:** Vincular permissão do checklist ao acesso da operação relacionada.
6. **Renewal Alerts & History:** Restringir alertas e histórico de renovação à carteira do corretor.
7. **Document Processing:** Unificar a política de processamento de documentos com a política de documentos já protegida.

## Refinamento de Segurança (Warnings)
1. **Cost Centers:** Restringir edição apenas para ADMIN e FINANCEIRO.
2. **Opportunities:** Eliminar sobreposição de políticas permissivas.
3. **Security Definer:** Revisar e restringir `EXECUTE` em funções críticas (ex: `has_role`).

## Verificação e Testes
1. **Auditoria E2E:** Testar acesso como ADMIN (global), GERENTE (equipe) e CORRETOR (isolado).
2. **Teste de IDOR:** Tentar acesso direto via UUID de registros de terceiros.
3. **Relatório Final:** Gerar `.lovable/audit/relatorio_auditoria_rbac_pos_deploy.md`.

## Detalhes Técnicos
- **RLS:** Uso de `EXISTS` em subqueries para herdar escopo de entidades pai (ex: `quotes` -> `opportunities` -> `broker_id`).
- **Performance:** Garantir que as subqueries de RLS usem índices (UUIDs).
- **Estabilidade:** Uso de `try/catch` e estados de erro amigáveis no frontend para queries de background.
