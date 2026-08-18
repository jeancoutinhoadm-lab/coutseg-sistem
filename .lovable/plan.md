# Plano de Evolução: Coutseg Gestão - Etapa 2 (Segurança e Permissões)

Foco em transformar o sistema em uma ferramenta segura e multi-nível, isolando dados e definindo acessos.

## Alterações Técnicas

### 1. Banco de Dados (Supabase Migration)
- **Cargos:** Criar `CREATE TYPE public.app_role AS ENUM ('admin', 'corretor', 'administrativo', 'financeiro', 'gerente')`.
- **Tabela `user_roles`:** Criar conforme diretrizes de segurança (bypassing RLS via function).
- **Função `has_role`:** Implementar `SECURITY DEFINER` para checagem de permissões.
- **Políticas RLS:** 
  - Restringir `clients`, `policies` e `claims`: 
    - `admin` e `gerente`: Acesso total.
    - `corretor`: Acesso apenas aos registros vinculados ao seu `user_id` (através da tabela `brokers`).
    - `administrativo` e `financeiro`: Acesso conforme necessidade operacional.
- **Auditoria:** Criar tabela `audit_logs` para rastrear quem alterou o quê.

### 2. Frontend (React)
- **Hooks:** Atualizar `useAuth` para retornar o cargo (role) do usuário.
- **Sidebar:** Ocultar módulos financeiros ou administrativos para o cargo `corretor`.
- **Proteção Visual:** Botões de exclusão ou edição restritos a cargos superiores.

### 3. Migração Inicial
- Definir o primeiro usuário (você) como `admin` para manter o controle.

## Próximos Passos
- Após aprovação, iniciarei a migração SQL e a refatoração do hook de autenticação.

---
Este plano garante que "o usuário somente consiga consultar os dados que sua função permite", conforme a regra mais importante.
