# Auditoria do Projeto Coutseg Gestão

## 1. O que já existe
- **Tecnologia:** React + TypeScript + TanStack Start v1 + Supabase (Lovable Cloud).
- **Autenticação:** Login/Registro funcional com e-mail e Google. Middleware `_authenticated` protegendo as rotas internas.
- **Banco de Dados:** Tabelas iniciais (`profiles`, `insurers`, `brokers`, `clients`, `policies`, `claims`) com RLS básico.
- **Frontend:** Sidebar navegável, formulários de cadastro para clientes, apólices, seguradoras, corretores e sinistros. Dashboard com métricas totais e renovações próximas.

## 2. O que funciona
- Acesso autenticado e persistência de sessão.
- Operações de CRUD em todos os módulos básicos.
- Redirecionamento automático de usuários não logados.
- Notificações de sucesso/erro nas ações do usuário.

## 3. O que está incompleto / Precisa ser melhorado
- **Cargos e Permissões:** Atualmente usa uma coluna simples `role` na tabela `profiles`. Precisa migrar para a arquitetura solicitada: `app_role` (admin, corretor, administrativo, financeiro, gerente), tabela `user_roles` e função `has_role` com RLS granular.
- **RLS:** As políticas atuais permitem que qualquer usuário autenticado veja todos os dados. O Corretor deve ver apenas seus próprios clientes/apólices.
- **Schema:** Faltam campos essenciais como `whatsapp`, tipo de cliente (PF/PJ), detalhes de pagamento nas apólices e o módulo de `products` gerenciável.
- **Financeiro:** Módulos de comissões, conciliação e contas a pagar/receber ainda não existem.
- **Inteligência:** Central de Entrada (Upload + IA) e Central de Operações (Alertas) não implementadas.

## 4. O que precisa ser corrigido
- **Privacidade:** Isolar dados entre corretores.
- **Integridade:** Validar CPF/CNPJ para evitar duplicidade de clientes no frontend e backend.

## 5. Próximas Etapas (Conforme Etapas Solicitadas)
- **ETAPA 2:** Refatorar Segurança (Cargos, `user_roles`, `has_role`, RLS restrito).
- **ETAPA 3:** Cadastro de Produtos (tabela) e expansão dos campos de Clientes e Seguradoras.
- **ETAPA 4/5:** Central de Entrada e Documentos (Storage).

---
Auditoria concluída. O projeto possui uma base sólida, mas precisa de refinamento imediato na camada de segurança e expansão do modelo de dados para atender aos requisitos de um sistema operacional interno real.
