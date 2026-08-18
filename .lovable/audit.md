# Auditoria do Projeto Coutseg Gestão

## 1. O que já existe
- **Infraestrutura:** TanStack Start v1 integrado com Lovable Cloud (Supabase).
- **Autenticação:** Fluxo completo com e-mail/senha e Google, incluindo middleware de proteção de rotas (`_authenticated`).
- **Banco de Dados:** Tabelas básicas (`profiles`, `insurers`, `brokers`, `clients`, `policies`, `claims`) com RLS habilitado.
- **Frontend:**
  - Layout com Sidebar funcional.
  - CRUDs básicos para Clientes, Seguradoras, Corretores, Apólices e Sinistros.
  - Dashboard inicial com métricas agregadas e visão de renovações.
  - Sistema de notificações (`sonner`).

## 2. O que funciona
- Login, Registro e Logout.
- Listagem e criação de registros em todos os módulos implementados.
- Filtro de renovações por dias.
- Responsividade básica (Sidebar retrátil).

## 3. O que está incompleto / Precisa ser melhorado
- **Cargos e Permissões:** Existe uma coluna `role` em `profiles` (admin/broker), mas não segue o modelo de segurança solicitado (tabela `user_roles`, função `has_role`, cargos granulares).
- **Financeiro:** Totalmente ausente (Contas a pagar/receber, comissões detalhadas, conciliação).
- **Central de Entrada:** Ausente (Upload e processamento de documentos).
- **IA:** Sem integração para OCR ou processamento de apólices.
- **Histórico/Timeline:** O perfil do cliente é apenas uma listagem, sem a timeline de eventos solicitada.
- **Produtos:** Atualmente usa um Enum fixo no banco, o usuário quer um cadastro gerenciável.
- **Cross-sell:** Lógica de oportunidades automáticas não implementada.

## 4. O que precisa ser corrigido
- **Segurança (RLS):** As políticas atuais são genéricas (`USING (true)` para authenticated), permitindo que qualquer usuário veja dados de outros corretores.
- **Schema de Clientes:** Faltam campos (`whatsapp`, `neighborhood`, `type` PF/PJ, etc.).
- **Schema de Apólices:** Faltam campos de pagamento e conciliação.

## 5. Próximas Etapas (Plano de Evolução)
1. **Refatoração de Segurança (Etapa 2):** Implementar `app_role` enum, `user_roles` table, `has_role` function e atualizar RLS.
2. **Expansão do Schema (Etapa 3):** Criar tabela `products`, expandir `clients` e `insurers`.
3. **Módulo de Documentos e Central de Entrada (Etapa 4/5):** Configurar Supabase Storage e UI de Upload.
4. **Financeiro e Comissões (Etapa 8/9):** Implementar lógica de conciliação.

---
Diagnóstico concluído. Pronto para iniciar a **ETAPA 2: Banco + Autenticação + Cargos + Permissões + RLS**.
