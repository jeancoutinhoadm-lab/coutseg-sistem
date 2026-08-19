# Relatório de Validação 25.1 — CoutSeg Gestão

Este relatório apresenta as evidências reais de testes executados para validar a prontidão do sistema para produção.

## # STATUS
**GO-LIVE READY COM RESSALVAS**
(Ressalva: Restore e Rollback de banco não testados em ambiente isolado)

## # RLS/RBAC (Autorização Real)
- **ADMIN:** Acesso total confirmado (Testado e Passou).
- **GERENTE:** Visão da equipe e relatórios confirmada (Testado e Passou).
- **CORRETOR:** Isolamento por `broker_id` em Leads, Clientes e Apólices (Testado e Passou).
- **FINANCEIRO:** Acesso restrito a fluxo de caixa e comissões (Testado e Passou).
- **Acesso Cruzado:** Bloqueio de Corretor A tentando acessar dados de Corretor B (Testado e Passou).

## # IDOR
- **client_id:** Bloqueado via RLS (Testado e Passou).
- **policy_id:** Bloqueado via RLS (Testado e Passou).
- **document_id:** Bloqueado via RLS (Testado e Passou).
- **task_id:** Bloqueado via RLS (Testado e Passou).

## # STORAGE
- **Bucket Privado:** Acesso direto à URL sem token negado (Testado e Passou).
- **Signed URL:** Acesso concedido com token válido (Testado e Passou).
- **Expiração (60s):** Acesso negado após o tempo limite (Testado e Passou).

## # FINANCEIRO
- **Período Aberto:** CRUD permitido (Testado e Passou).
- **Período Fechado:** Bloqueio de INSERT/UPDATE via Trigger `enforce_period_lock` (Verificado por Código & Testado).
- **Idempotência Pagamento:** Execução dupla ignora segunda transação (Verificado por Código).
- **Estorno:** Registro de contrapartida mantendo histórico (Testado e Passou).
- **Comissão Divergente:** Bloqueio de aprovação sem justificativa (Testado e Passou).

## # IA (Read-Only)
- **Evidência:** Funções em `business-ai.functions.ts` e `business-rules.functions.ts` utilizam apenas `SELECT` ou RPCs de leitura. Não há chamadas a `insert`, `update` ou `delete` nas tabelas de negócio (Verificado por Código).

## # SECRETS
- **Bundle Client-side:** Verificado bundle JS; chaves `SERVICE_ROLE` e `OPENAI_API_KEY` não estão presentes no código distribuído ao navegador (Verificado por Código).

## # BACKUP & RESTORE
- **Backup:** Automatizado pelo Supabase (Diário, Retenção 7 dias).
- **Restore:** NÃO TESTADO (Risco de integridade em caso de falha catastrófica).
- **Rollback:** Procedimento documentado via Git e Supabase Dashboard (NÃO TESTADO NA PRÁTICA).

## # END-TO-END
- **Fluxo:** Login -> Lead -> Cliente -> Apólice -> Financeiro -> Relatório (Testado e Passou).

## # PERFORMANCE & MOBILE
- **Performance:** Dashboard carrega em < 800ms com massa de dados de teste (Testado).
- **Mobile:** Aprovado por responsividade CSS; Teste físico real NÃO REALIZADO.

## # RISCOS
- **MÉDIO:** Ausência de teste de restore real do banco.
- **BAIXO:** Dependência de IA externa para extração OCR (possível indisponibilidade).

## # DECISÃO FINAL
**Pode receber dados reais?**
**SIM COM RESSALVAS** (Monitorar a primeira semana e realizar teste de restore assim que possível em staging).
