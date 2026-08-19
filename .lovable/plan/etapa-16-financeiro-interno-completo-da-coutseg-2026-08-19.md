# Etapa 16: Financeiro Interno Completo da CoutSeg

Este módulo consolida o controle financeiro interno da corretora, integrando comissões, conciliações, contas a pagar e a receber, sem exposição ou automação de pagamentos para clientes externos.

## 1. Mapeamento e Auditoria
- Mapear tabelas existentes: `commission_receipts`, `bank_accounts`, `document_processing`.
- Evitar duplicação: Reutilizar `bank_accounts` e `commission_receipts`.
- Evoluir `commission_receipts` para suportar o fluxo completo de "Contas a Receber".

## 2. Estrutura de Dados (Database)
- **Finance Accounts**: Reutilizar/ajustar `bank_accounts` (name, institution, type, initial_balance).
- **Categories**: Criar `financial_categories` (id, name, type [INCOME/EXPENSE], description).
- **Cost Centers**: Criar `cost_centers` (id, name, description).
- **Financial Entries (Transactions)**: Criar `financial_entries` para registrar o fluxo de caixa (regime de caixa).
    - Link para `bank_accounts`, `financial_categories`, `cost_centers`, `documents`.
- **Payables**: Criar `payables` para contas a pagar (regime de competência).
    - Status: PENDING, APPROVED, PAID, CANCELLED.
    - Suporte a recorrência e anexação de boletos via `documents`.
- **Receivables (Evolução)**: Integrar `commission_receipts` como a base de contas a receber de comissões.
    - Adicionar suporte a outras receitas se necessário via tabela genérica `receivables`.

## 3. Segurança e Regras de Negócio
- **RLS**: Acesso total para ADMIN/FINANCEIRO. CORRETOR vê apenas comissões vinculadas.
- **Integridade**: Constraints para evitar datas inconsistentes e valores negativos indevidos.
- **Auditoria**: Registrar eventos `FINANCIAL_ENTRY_CREATED`, `PAYABLE_PAID`, etc., na `audit_logs`.
- **Diferenciação**: Separar datas de competência, vencimento e pagamento/recebimento.

## 4. Interface (Frontend)
- **Dashboard Financeiro**: Resumo de saldo, contas a receber (vencido/a vencer) e contas a pagar.
- **Fluxo de Caixa**: Visão mensal consolidada (Entradas - Saídas).
- **Gestão de Contas**: Listagem e edição de contas bancárias.
- **Contas a Pagar**: Cadastro de despesas, aprovação e registro de pagamento com anexo de boleto.
- **Contas a Receber**: Visão integrada com o módulo de comissões e conciliação.
- **Relatórios**: Visão para contabilidade (exportação simplificada via UI).

## 5. Testes e Validação
- Fluxo completo: Upload Relatório -> IA -> Comissão -> Conciliação -> Recebimento -> Fluxo de Caixa.
- Validação de recebimentos/pagamentos parciais.
- Proteção contra exclusão física (Soft delete/Estorno).

## Detalhes Técnicos
- Utilizar `createServerFn` para operações financeiras sensíveis.
- Manter o motor de conciliação atômico via RPCs SQL existentes.
- Interface com Shadcn/UI e TanStack Table para grandes volumes de dados.
