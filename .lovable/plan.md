# ETAPA 29.1 — CORREÇÃO DAS RESSALVAS DE UX DA CENTRAL DE OPERAÇÕES

A Central de Operações da CoutSeg evoluirá para orquestrar fluxos complexos de forma fluida, mantendo a integridade financeira e documental.

## Ações Propostas

### 1. Cadastro de Cliente Inline no Wizard
- **Componente:** `UnifiedClientSearch` evoluirá para oferecer um formulário de cadastro rápido quando a busca falhar.
- **Fluxo:** O operador não abandona o Wizard. O cliente é criado e selecionado automaticamente para a etapa seguinte.
- **Idempotência:** Validação de CPF/CNPJ antes da criação para evitar duplicidade.

### 2. Anexo de Documentos Integrado
- **Ação:** Permitir o upload de arquivos diretamente na etapa do checklist da operação.
- **Segurança:** Utilização do bucket `policy_documents` com RLS e geração de SHA-256 para auditoria.
- **IA:** O documento entra na fila de processamento (`document_processing`) automaticamente.

### 3. Registro de Comissão Orquestrado
- **Ação:** Interface simplificada para registrar o valor previsto de comissão.
- **Integração:** Inicia um registro na tabela `commissions` vinculado à apólice/operação, respeitando as travas de conciliação.

### 4. Checklist Dinâmico e Reativo
- **Lógica:** O checklist em `operation_checklists` será atualizado em tempo real com base nas escolhas do operador.
- **Estados:** Bloqueio da conclusão da operação se requisitos "required" estiverem pendentes.

### 5. Resumo e Conclusão
- **UX:** Tela de revisão final com indicadores claros de Pendência (⚠) vs Completo (✓).
- **Feedback:** Tela de sucesso com atalhos para os registros criados (Apólice, Cliente, Tarefas).

## Detalhes Técnicos

- **Frontend:** Refatoração de `src/routes/_authenticated/operations.tsx` para incluir sub-componentes de formulários inline.
- **Backend:** Expansão de `src/lib/operations.functions.ts` com novas funções servidoras para lidar com a progressão da operação e validação de pendências.
- **RLS/RBAC:** Sem alterações nas políticas, garantindo que a Central apenas utilize as permissões já concedidas aos cargos.
