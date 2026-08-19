# Plano de Evolução Financeira - Etapa 6

Auditoria e estruturação do núcleo financeiro da CoutSeg para suportar comissões previstas vs. recebidas, pagamentos parciais e conciliação.

## 1. Banco de Dados e Schema (Migrations)
- Criar tabela `public.bank_accounts` para gestão de caixa e contas.
- Criar tabela `public.commission_receipts` para suportar múltiplos recebimentos por comissão (evitando sobrescrever histórico).
- Adicionar coluna `received_amount` (acumulada) e `divergence_amount` em `commissions` se necessário, ou usar a soma de `commission_receipts`.
- Adicionar suporte a status: `PREVISTA`, `PARCIALMENTE_RECEBIDA`, `RECEBIDA`, `DIVERGENTE`, `PENDENTE`, `CANCELADA`.
- Adicionar coluna `recurrence` e `due_day` em `expenses` para preparar recorrência futura.
- Adicionar índices para performance financeira (data, status, policy_id).

## 2. Lógica e Triggers
- Corrigir trigger `create_initial_commission` para garantir idempotência (não duplicar ao editar apólice).
- Implementar trigger para atualizar automaticamente o status da comissão baseado nos recebimentos vinculados.
- Garantir que `audit_financial_changes` capture os novos campos.

## 3. Segurança (RLS)
- Implementar políticas restritivas:
    - **ADMIN/FINANCEIRO/GERENTE**: Acesso total.
    - **CORRETOR**: SELECT apenas em comissões de suas próprias apólices.
    - **ADMINISTRATIVO**: Bloqueio de valores financeiros sensíveis.
- Bloquear `DELETE` físico em tabelas financeiras, permitindo apenas `status = 'cancelled'`.

## 4. Testes de Validação
- Executar os 10 testes obrigatórios via scripts de banco ou interface.
- Validar cálculos de divergência.
- Validar fluxo de comissão vinculada (Apólice -> Comissão -> Receita).

## Detalhes Técnicos
- Uso de `numeric(12,2)` para precisão monetária.
- Relacionamento `documents` -> `financial records` para comprovantes.
- Scripts SQL neutros (não destrutivos).
