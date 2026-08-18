# Plano de Evolução: Coutseg Gestão - Etapa 4

Implementação da gestão de documentos digitais com suporte a upload de apólices originais e preparação para processamento por IA.

## Mudanças Técnicas

### Banco de Dados (Lovable Cloud)
- Criação do Bucket `policy_documents` no Storage para armazenamento de arquivos (PDF/Imagens).
- Criação da tabela `documents` para gerenciar metadados de arquivos vinculados a apólices ou clientes.
- Políticas de RLS para garantir que corretores acessem apenas documentos de seus respectivos clientes.

### Frontend (React/TanStack)
- **Central de Documentos:** Nova rota `/_authenticated/documents` para listagem geral.
- **Upload de Apólices:** Integração de upload de arquivos no formulário de apólices (`policies.tsx`).
- **Visualizador:** Componente para visualização/download de documentos anexados.

### Segurança
- Configuração de políticas de Storage (RLS).
- Registro de auditoria para uploads e visualizações de arquivos sensíveis.

## Impacto no Usuário
O sistema deixará de ser apenas um registro de dados para se tornar um repositório seguro de documentos, eliminando a dependência de arquivos físicos ou pastas externas.
