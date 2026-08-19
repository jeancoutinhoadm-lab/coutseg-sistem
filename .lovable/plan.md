# ETAPA 7 — ARQUITETURA SEGURA DE IA PARA LEITURA DE DOCUMENTOS

Esta etapa estabelece a fundação técnica para o processamento inteligente de documentos, priorizando segurança, auditoria e integridade de dados sem acoplar a um provedor de IA específico neste momento.

## 1. Evolução do Schema de Processamento

Ajustar a tabela `document_processing` para suportar o fluxo de estados completo e garantir a rastreabilidade.

- **Status:** Atualizar enum/check para `PENDING`, `PROCESSING`, `EXTRACTED`, `NEEDS_REVIEW`, `APPROVED`, `REJECTED`, `FAILED`.
- **Rastreabilidade:** Garantir que `document_id` seja a âncora de toda extração.
- **Auditoria de Versão:** Adicionar campos `ai_model`, `ai_prompt_version` e `ai_confidence` (JSONB para granularidade por campo).
- **Idempotência:** Garantir que reprocessamentos sejam rastreados como novas tentativas ou versões, evitando duplicidades.

## 2. Refinamento de RLS e Segurança

Proteção rigorosa para que a IA (ou usuários não autorizados) não escreva diretamente nas tabelas principais.

- **Tabelas Principais:** Manter RLS atual.
- **Tabela document_processing:** Restringir `extracted_data` e `status` apenas para ADMIN/ADMINISTRATIVO.
- **Fluxo de Aprovação:** Criar uma função no banco para mover dados de `extracted_data` para as tabelas finais (`clients`, `policies`, etc.) somente após aprovação humana explícita.

## 3. Frontend: Central de Entrada e Revisão

Evoluir a UI da Central de Entrada para gerenciar o novo fluxo.

- **Estados de UI:** Refletir os novos status do backend.
- **Componente de Revisão:** Criar interface para comparar dados extraídos com o documento original antes da aprovação.
- **Logs de Processamento:** Exibir histórico de tentativas e erros de forma amigável.

## Detalhes Técnicos

### Alterações de Banco de Dados (Migration SQL)

1.  **Enum de Status:** Atualizar `document_processing.status` para incluir os novos estados.
2.  **Novas Colunas:**
    - `ai_model` (text): Nome do modelo (ex: 'gpt-4o').
    - `ai_prompt_version` (text): Versão do prompt utilizado.
    - `ai_confidence` (jsonb): Confiança por campo (ex: `{"policy_number": 0.99}`).
    - `attempts` (int): Contador de retentativas.
    - `reviewed_by` (uuid): Referência ao usuário que aprovou/rejeitou.
    - `reviewed_at` (timestamptz): Data da revisão.
3.  **RLS:** Refinar políticas para garantir que apenas o sistema (via service_role) ou usuários autorizados alterem status de processamento.

### Alterações de Aplicação (React)

1.  **`src/routes/_authenticated/central-entrada.tsx`**:
    - Adaptar para o novo ciclo de status.
    - Implementar lógica de "Revisão Necessária".
    - Adicionar botões de "Aprovar" e "Rejeitar" (acessíveis apenas por perfis autorizados).
2.  **`src/lib/ai-extraction.functions.ts`**:
    - Refatorar para salvar metadados de modelo e versão.
    - Implementar simulação de extração para testes da Etapa 7.

## Matriz de Testes (Simulados)

- **Teste 1:** Upload -> Criar `document_processing` como `PENDING`.
- **Teste 2:** Simular início -> Status `PROCESSING`.
- **Teste 3:** Simular extração -> Status `NEEDS_REVIEW` com dados em `extracted_data`.
- **Teste 4:** Verificar bloqueio de edição direta de `extracted_data` via API pública.
- **Teste 5:** ADMIN aprova -> Status `APPROVED` e registro de auditoria.
- **Teste 6:** Reprocessar -> Novo ciclo controlado sem duplicar registros principais.
