# Auditoria de Segurança e Integração Supabase - Coutseg

## 1. Banco de Dados (public.documents)
- **Estrutura:** Tabela `public.documents` com colunas `id`, `name`, `file_path`, `file_type`, `size`, `policy_id`, `client_id`, `uploaded_by`, `created_at`, `updated_at`.
- **Foreign Keys:**
  - `policy_id` -> `public.policies(id)`
  - `client_id` -> `public.clients(id)`
  - `uploaded_by` -> `auth.users(id)`
- **RLS:** Habilitado.
- **Políticas Existentes:**
  - "Admins can manage all documents": Permite tudo para administradores.
  - "Brokers can manage their own documents": Permite tudo para corretores, mas com uma condição complexa baseada em `policy_id` ou `client_id`.
- **Causa do Bloqueio (INSERT):** A política atual para corretores exige que o documento já esteja vinculado a uma apólice ou cliente que pertença ao corretor. No entanto, no fluxo da "Central de Entrada", o documento é criado **antes** de ser vinculado a uma apólice. Como o `policy_id` e `client_id` são nulos no momento do INSERT inicial, a política falha.

## 2. Autenticação e Cargos
- **Usuário:** A autenticação é real via Supabase Auth.
- **Cargo:** O cargo é armazenado na tabela `public.user_roles` vinculado ao `user_id`.
- **Identificação:** As políticas RLS utilizam a função `public.has_role(auth.uid(), 'cargo')` para validar permissões no servidor.

## 3. Storage (policy_documents)
- **Bucket:** `policy_documents`.
- **Privacidade:** O bucket é privado (confirmado via migração).
- **Políticas de Storage:**
  - "Allow authenticated uploads to policy_documents": Permite INSERT para qualquer usuário autenticado.
  - "Allow owners and admins to select from policy_documents": Restringe leitura ao dono do arquivo ou administradores.
- **Causa do Bloqueio (Storage):** O erro reportado pelo usuário é na tabela `documents` do banco de dados, não no Storage, indicando que o arquivo é enviado, mas o registro no banco falha.

## 4. Correção Proposta
- Ajustar a política de INSERT na tabela `public.documents` para permitir que usuários autenticados com cargos operacionais possam criar o registro inicial, desde que sejam os donos (`uploaded_by`).
- Manter a restrição de SELECT/UPDATE/DELETE baseada na propriedade do documento ou no cargo de administrador.
- O bucket de Storage permanecerá privado, garantindo a segurança dos PDFs.

---
*Assinado: Lovable Agent*
