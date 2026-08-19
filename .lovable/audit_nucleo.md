# Auditoria Técnica — Núcleo Operacional (Etapa 4)

## Estrutura Atual do Banco de Dados

### Tabelas Principais
- **clients**: Entidade central para PF e PJ.
  - Campos: `id`, `full_name`, `cpf_cnpj`, `email`, `phone`, `whatsapp`, `type`, `status`, `broker_id`, `address`, `city`, `state`, `zip_code`, etc.
  - Foreign Key: `broker_id` -> `brokers(id)`.
- **policies**: Contratos de seguro vinculados a clientes e seguradoras.
  - Campos: `id`, `policy_number`, `client_id`, `insurer_id`, `broker_id`, `type` (enum), `status` (enum), `start_date`, `end_date`, `premium`, `commission_amount`, etc.
  - Foreign Keys: `client_id` -> `clients(id)`, `insurer_id` -> `insurers(id)`, `broker_id` -> `brokers(id)`.
- **insurers**: Lista de seguradoras parceiras.
  - Campos: `id`, `name`, `cnpj`, `email`, `phone`, `website`, `active`.
- **products**: Ramos de seguro/produtos (Auto, Vida, etc.).
  - Campos: `id`, `name`, `description`, `active`.
- **documents**: Arquivos digitais (PDF/Imagens).
  - Campos: `id`, `name`, `file_path`, `client_id`, `policy_id`, `uploaded_by`.
  - Foreign Keys: `client_id` -> `clients(id)`, `policy_id` -> `policies(id)`.

### Relacionamentos
- `1 Cliente -> N Apólices` (Correto)
- `1 Apólice -> 1 Cliente` (Correto)
- `1 Apólice -> 1 Seguradora` (Correto)
- `1 Apólice -> 1 Produto` (Atualmente via enum `policy_type`, precisa migrar para `products_id`)

## Problemas Identificados

### Integridade e Constraints
1. **Datas Inconsistentes**: Não há CHECK constraint para `start_date < end_date` na tabela `policies`.
2. **Duplicidades Potenciais**: Não há índices UNIQUE ou constraints preventivas definitivas no banco para `clients.cpf_cnpj` ou `insurers.cnpj` (embora exista validação no frontend).
3. **Apólices e Seguradoras**: Algumas apólices podem estar usando enums estáticos em vez de referenciar a tabela `products` de forma robusta.

### RLS (Row Level Security)
- As políticas atuais são funcionais, mas precisam de refinamento para garantir que o cargo **CORRETOR** não veja clientes órfãos ou atribuídos a outros, e que o cargo **FINANCEIRO** tenha acesso estritamente necessário.

### Análise de Dados (Auditoria de Leitura)
- **Clientes Duplicados**: [Aguardando resultado da query]
- **Apólices Órfãs**: [Aguardando resultado da query]
- **Seguradoras Duplicadas**: [Aguardando resultado da query]
- **Datas Inválidas**: [Aguardando resultado da query]

---

## Plano de Ação (Etapa 4)

### 1. Reforço da Integridade (Migration SQL)
- Adicionar `CHECK (start_date < end_date)` em `policies`.
- Adicionar índices para performance em `clients.cpf_cnpj`, `policies.client_id`, `policies.insurer_id`, `policies.broker_id`.
- Adicionar `NOT NULL` em campos críticos onde for seguro.

### 2. Refinamento de RLS
- Garantir isolamento total por `broker_id` para o cargo `corretor`.
- Permitir que `gerente` e `admin` vejam tudo.
- Permitir que `administrativo` e `financeiro` vejam clientes/apólices para fins operacionais/financeiros.

### 3. Ajustes no Frontend
- Melhorar a diferenciação visual entre PF e PJ no formulário de clientes.
- Garantir que a exclusão de clientes seja impedida se houver apólices vinculadas (RESTRICT) ou que o usuário seja alertado.
- Exibição segura de dados sensíveis (máscaras).
