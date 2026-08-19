# Plano Etapa 11 — Motor de Conciliação de Comissões

Este plano detalha a implementação do motor de conciliação financeira, garantindo que as comissões importadas sejam comparadas com o esperado e auditadas com rastreabilidade total.

## 1. Ajustes no Schema (Migração)
*   **Comissões**: Adicionar coluna `reported_amount` (valor informado no relatório) para separar de `expected_amount` e `received_amount`.
*   **Conciliação**: Criar tabela `commission_reconciliations` para registrar ajustes manuais, justificativas e auditoria específica.
*   **Status**: Adicionar/Refinar status de conciliação (`matched`, `divergent`, `reconciled`, `reversed`).
*   **RLS**: Garantir que as políticas permitam acesso adequado por cargo (Financeiro/Admin).

## 2. Refinamento da Extração IA
*   Ajustar o prompt para garantir a distinção clara entre valor esperado pela seguradora e valor efetivamente pago.
*   Melhorar o matching de apólices no backend para usar múltiplos critérios (Apólice, Seguradora, Competência).

## 3. Lógica de Negócio e RPC
*   Implementar a lógica de cálculo de diferença (`difference = reported - expected`).
*   Criar RPC atômica para conciliação manual que registra o ajuste, a justificativa e gera o log de auditoria em uma única transação.
*   Implementar proteção contra duplicidade de conciliação.

## 4. Interface de Revisão e Conciliação
*   Atualizar a tabela de revisão na "Central de Entrada" para mostrar `Esperado`, `Reportado` e `Diferença`.
*   Adicionar modal de conciliação manual que exige justificativa.
*   Implementar badges de status de conciliação.

## 5. Dashboard e Relatórios
*   Auditar e atualizar o dashboard financeiro para consolidar os novos campos.
*   Garantir filtros por seguradora, competência e status de conciliação.

## 6. Verificação e Testes
*   Executar os 15 testes obrigatórios definidos na especificação.
*   Validar RLS e transações atômicas.

## Detalhes Técnicos
*   **Tabelas Afetadas**: `commissions`, `commission_reconciliations`, `audit_logs`.
*   **Tecnologias**: PostgreSQL, TanStack Query/Table, Supabase RPC.
*   **Segurança**: RLS por `app_role`, RPC com `SECURITY DEFINER` e `search_path`.
