# Plano de Evolução: Coutseg Gestão - Etapa 2 (Segurança e Cargos)

Implementação do sistema de permissões robusto conforme a especificação.

## Alterações Técnicas

### 1. Banco de Dados (Supabase)
- **Cargos:** Criar `app_role` enum (admin, corretor, administrativo, financeiro, gerente).
- **Tabela `user_roles`:** Vincular usuários aos cargos.
- **Função `has_role`:** Criar função `security definer` para evitar recursão em RLS.
- **RLS:** Atualizar políticas de `clients`, `policies`, `brokers` e `insurers` para restringir acesso baseado no cargo e no vínculo (ex: Corretor só vê seus clientes).
- **Auditoria:** Criar tabela `audit_logs` e triggers para capturar mudanças.

### 2. Frontend
- **Auth Hook:** Refatorar `useAuth` para carregar o cargo do usuário a partir da nova tabela.
- **Sidebar:** Ajustar visibilidade dos módulos baseada no cargo.
- **Proteção de Rotas:** Garantir que usuários sem permissão não acessem módulos restritos.

### 3. Migração de Dados
- Migrar o `role` atual da tabela `profiles` para a nova tabela `user_roles`.

## Ordem de Execução
1. Migração SQL (Schema + RLS).
2. Atualização do `useAuth`.
3. Ajustes de UI na Sidebar.

---
Este plano estabelece a base de confiança necessária para operar um sistema real com múltiplos níveis de acesso.
