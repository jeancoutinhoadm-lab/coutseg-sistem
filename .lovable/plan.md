# Plano de Evolução: Coutseg Gestão - Etapa 2

Implementação da base de segurança, cargos e permissões conforme a especificação mestra.

## Alterações Técnicas

### Banco de Dados (Supabase)
- **Enums:** Criar `app_role` (admin, corretor, administrativo, financeiro, gerente).
- **Tabela `user_roles`:** Gerenciar cargos vinculados a `auth.users`.
- **Função `has_role`:** Security definer para verificação de permissões em RLS.
- **Políticas RLS:** Atualizar todas as tabelas existentes para restringir acesso conforme o cargo (ex: Corretor só vê seus clientes).
- **Tabela `audit_logs`:** Estrutura básica para rastreabilidade de ações.

### Frontend
- **Auth Hook:** Atualizar `useAuth` para carregar e expor o cargo do usuário.
- **Componentes de UI:** Adicionar proteção visual (esconder menus/botões) baseada no cargo.
- **Sidebar:** Ajustar visibilidade de itens conforme permissão.

### Segurança
- Garantir que `service_role` tenha acesso total para operações de sistema.
- Implementar `GRANT` explícitos em todas as novas tabelas.

## Ordem de Execução
1. Executar migração SQL para cargos e funções.
2. Atualizar políticas RLS das tabelas atuais (`clients`, `policies`, etc.).
3. Criar tabela de Auditoria.
4. Refatorar `use-auth.ts`.
5. Ajustar layout da Sidebar.

---
Este plano foca na **Etapa 2** da especificação, garantindo que o sistema seja "seguro e preparado para crescer".
