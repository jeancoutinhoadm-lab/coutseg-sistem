# Plano de Evolução: Coutseg Gestão - Etapa 2 (Segurança e Cargos)

Implementar a estrutura de segurança solicitada para garantir que o sistema suporte diferentes níveis de acesso e isolamento de dados.

## Detalhes da Implementação

### 1. Banco de Dados (Supabase SQL)
- **Definição de Cargos:** Criar o enum `app_role` com os 5 níveis solicitados.
- **Tabela `user_roles`:** Implementar a tabela de junção para usuários e cargos.
- **Função de Segurança:** Criar `has_role(uid, role)` com `SECURITY DEFINER` para checagem robusta.
- **Políticas RLS Refinadas:**
  - **Clientes/Apólices:** `admin` e `gerente` vêem tudo; `corretor` vê apenas o que está vinculado a ele.
  - **Financeiro:** Acesso restrito a `admin`, `financeiro` e `administrativo`.
- **Logs de Auditoria:** Criar tabela `audit_logs` para rastrear ações críticas (criação/edição/exclusão).

### 2. Frontend (React)
- **useAuth Hook:** Atualizar para expor o cargo do usuário logado.
- **Sidebar Dinâmica:** Mostrar/ocultar módulos (ex: "Financeiro" sumindo para o Corretor).
- **Proteção de Rotas:** Bloqueio via código para tentativas de acesso direto via URL.

### 3. Migração de Dados
- Mapear o atual `admin` e `broker` da tabela `profiles` para os novos cargos na tabela `user_roles`.

---
Este passo é crucial para transformar o protótipo em uma "aplicação funcional, organizada e segura".
