# Plano de Evolução: Coutseg Gestão - Etapa 3

Focaremos em organizar a base de dados de **Clientes** e **Produtos** para suportar a automação futura.

## Mudanças Técnicas

### Banco de Dados (Supabase)
- **Tabela `products`**: Criar tabela para gerenciar os tipos de seguros (Auto, Vida, etc.).
- **Tabela `clients`**: 
    - Adicionar campos faltantes: `type` (PF/PJ), `whatsapp`, `neighborhood`, `complement`, `status`.
    - Adicionar constraint `UNIQUE` no campo `cpf_cnpj` para evitar duplicidade.
- **Grants & RLS**: Garantir que as novas tabelas tenham permissões corretas por cargo.

### Frontend (React/TanStack)
- **Página de Produtos**: Criar interface CRUD para o Administrador.
- **Página de Clientes**: 
    - Atualizar o formulário para incluir os novos campos.
    - Implementar lógica de verificação de CPF/CNPJ existente antes de criar novo.
    - Adicionar filtros por Status e Corretor.
- **Sidebar**: Adicionar link para "Produtos".

## Impacto no Usuário
- O Administrador poderá cadastrar novos ramos de seguro.
- O cadastro de clientes ficará mais completo, servindo de base para a Central de Entrada Inteligente.
- Segurança garantida: corretores continuam vendo apenas seus próprios clientes (conforme RLS atual).

## Technical Details
- Migrations SQL para `products` e alterações em `clients`.
- Atualização dos tipos no frontend via `Database["public"]["Tables"]`.
- Uso de `sonner` para alertas de duplicidade.
