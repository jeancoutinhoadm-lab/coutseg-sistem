# Plano de Implementação — Etapa 28: Central de Operações da CoutSeg

A Etapa 28 visa unificar a experiência operacional, permitindo que o usuário inicie qualquer processo a partir de uma "Nova Operação", conduzindo-o através de um fluxo orquestrado (Wizard) que reaproveita os módulos de Clientes, Apólices, Documentos e Financeiro já existentes.

## 1. Schema e Infraestrutura (Backend)
- Criar a tabela `operations` para rastrear o ciclo de vida de cada processo.
- Criar a tabela `operation_checklists` para gerenciar o progresso das etapas obrigatórias.
- Implementar triggers para auditoria e logs de alteração.

## 2. Motor de Orquestração (`src/lib/operations.functions.ts`)
- `createOperation`: Inicia um fluxo (Venda Nova, Renovação, etc.).
- `searchOperationTarget`: Busca unificada de clientes (CPF/CNPJ, nome, telefone).
- `updateOperationStatus`: Valida checklists e trava a conclusão se faltarem dados.
- `linkOperationArtifacts`: Vincula apólices, documentos e tarefas à operação.

## 3. Frontend: Central de Operações
- **Página Central:** `/operations` com listagem de processos ativos.
- **Botão "Nova Operação":** Modal de escolha de tipo (Venda, Renovação, Endosso, etc.).
- **Fluxo Guiado (Wizard):**
    - Passo 1: Identificação do Cliente (Busca ou Novo Cadastro).
    - Passo 2: Dados da Operação (específico por tipo).
    - Passo 3: Documentação (Upload e IA Sandbox).
    - Passo 4: Resumo e Checklist.
- **Visualização da Operação:** Timeline, checklist interativo e documentos vinculados.

## 4. Integrações e Ciclo de Vida
- **Renovação:** Localiza apólices anteriores e preenche dados automaticamente.
- **Endosso/Cancelamento:** Registra alterações preservando o histórico via `audit_logs`.
- **Financeiro:** Criação de `commission_receipts` somente em eventos reais.
- **Tarefas:** Geração automática de pendências quando etapas não forem concluídas.

## Detalhes Técnicos

### Novo Schema SQL
```sql
CREATE TYPE public.operation_type AS ENUM ('new_sale', 'renewal', 'endorsement', 'cancellation', 'update');
CREATE TYPE public.operation_status AS ENUM ('draft', 'in_progress', 'pending_docs', 'review', 'completed', 'cancelled');

CREATE TABLE public.operations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type operation_type NOT NULL,
    status operation_status NOT NULL DEFAULT 'draft',
    client_id uuid REFERENCES public.clients(id),
    policy_id uuid REFERENCES public.policies(id), -- Apólice alvo ou resultante
    previous_policy_id uuid REFERENCES public.policies(id), -- Para renovação/endosso
    responsible_id uuid REFERENCES auth.users(id),
    title text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE public.operation_checklists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id uuid REFERENCES public.operations(id) ON DELETE CASCADE,
    task_name text NOT NULL,
    is_completed boolean DEFAULT false,
    required boolean DEFAULT true,
    completed_at timestamptz,
    completed_by uuid REFERENCES auth.users(id)
);
```

### Regras de RLS
- Corretor: Vê apenas operações que ele criou ou onde é o `responsible_id`.
- Gerente/Admin: Visão total.
- Financeiro: Vê operações vinculadas a eventos financeiros.

## Segurança e Auditoria
- Cada passo do checklist gera um registro em `audit_logs`.
- Documentos seguem a política `storage_select_isolated_v3`.
- Travas de segurança impedem `completed` sem checklist 100% preenchido.
