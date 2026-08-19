# Plano de Implementação - Etapa 5: Ciclo de Vida e Renovações

Este plano foca na gestão completa do ciclo de vida das apólices, garantindo rastreabilidade, histórico de renovações e segurança.

## 1. Banco de Dados (SQL Migration)
- **Novos Status**: Alterar o tipo enum `policy_status` para incluir: `lead`, `quotation`, `proposal`, `analyzing`, `issued`, `active`, `renewed`, `expired`, `cancelled`, `refused`.
- **Encadeamento de Renovações**: Adicionar coluna `renewed_from_policy_id` na tabela `policies` com FK para ela mesma.
- **Controle de Cancelamento**: Adicionar `cancellation_reason` (text) e `cancellation_date` (date).
- **Metadados Operacionais**: Adicionar `issuance_date` (date) e `updated_by` (uuid).
- **Segurança**: Garantir que as políticas RLS cubram os novos campos.

## 2. Consultas de Inteligência Operacional
- Criar funções ou queries otimizadas para o Dashboard e listagens:
  - Próximos Vencimentos (90, 60, 30, 15, 7 dias).
  - Histórico Cronológico de Renovação de um Cliente.

## 3. Interface do Usuário (Frontend)
- **Fluxo de Renovação**: Adicionar botão "Renovar" na lista de apólices que abre o formulário pré-preenchido vinculando ao ID anterior.
- **Fluxo de Cancelamento**: Adicionar botão "Cancelar" que abre modal para justificativa.
- **Filtros Avançados**: Permitir filtrar apólices por "Vencendo em X dias" e por novos status.
- **Timeline do Cliente**: (Preparação) Garantir que a lista de apólices no contexto do cliente diferencie Vigentes de Histórico.

## 4. Auditoria e Validação
- Realizar teste de 7 pontos conforme especificação (Criação, Renovação, Cancelamento, Vínculo de Documentos, Validação de Datas, RLS, Consultas de Vencimento).

## Critérios de Aceite
- [ ] Possibilidade de rastrear a origem de uma apólice renovada.
- [ ] Apólices antigas mantidas como "Renovadas" ou "Expiradas" sem perda de dados.
- [ ] Filtros de vencimento funcionando corretamente.
- [ ] Bloqueio de datas inválidas persistido no banco e validado no front.
