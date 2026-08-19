# Auditoria Técnica — Ciclo de Vida da Apólice (Etapa 5)

## Análise da Estrutura Atual
- **Tabela `policies`**:
  - Campos existentes: `id`, `policy_number`, `client_id`, `insurer_id`, `broker_id`, `type`, `status`, `start_date`, `end_date`, `premium`, `commission_amount`.
  - Enums de Status: `active`, `pending`, `expired`, `cancelled`.
- **Relacionamentos**:
  - `policies` -> `clients` (FK)
  - `policies` -> `insurers` (FK)
  - `policies` -> `brokers` (FK)
- **Documentos**:
  - Tabela `documents` já vincula a `policy_id`.

## Lacunas Identificadas
1. **Histórico de Renovação**: Não há campo `renewed_from_policy_id` para encadear apólices.
2. **Status Insuficientes**: Faltam status como `cotacao`, `proposta`, `em_analise`, `renovada`, `recusada`.
3. **Cancelamento**: Falta campo para `cancellation_reason` e `cancellation_date`.
4. **Endossos**: Não há estrutura para registrar alterações sem invalidar a apólice principal.
5. **Datas**: A constraint `check_policy_dates` (Etapa 4) já garante `end_date > start_date`.

---

## Plano de Ação (Etapa 5)

### 1. Evolução do Schema (Migration SQL)
- **Status Enum**: Expandir `policy_status` para incluir: `lead`, `quotation`, `proposal`, `analyzing`, `issued`, `active`, `renewed`, `expired`, `cancelled`, `refused`.
- **Relacionamento**: Adicionar `renewed_from_policy_id` (FK para `policies.id`).
- **Cancelamento**: Adicionar `cancellation_reason` (text) e `cancellation_date` (date).
- **Metadados**: Adicionar `issuance_date` (data de emissão).

### 2. Lógica de Negócio (Consultas/Views)
- Preparar consultas para vencimentos em 90, 60, 30, 15 e 7 dias baseadas em `end_date`.

### 3. Frontend (UI)
- Atualizar o formulário de apólices para suportar os novos status.
- Criar a ação "Renovar" que pré-preenche uma nova apólice mantendo o vínculo com a anterior.
- Implementar diálogo de cancelamento para coletar motivo e data.

### 4. Auditoria de Dados (Leitura)
- Verificar apólices com `end_date` no passado que ainda estão como `active`.
- Identificar apólices duplicadas por `policy_number` + `insurer_id`.
