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
- **Cargos e Permissões:** Existe uma coluna `role` em `profiles`, mas não há a tabela `user_roles` nem a função `has_role` conforme as melhores práticas de segurança solicitadas. O RLS atual é permissivo para usuários autenticados.
- **Financeiro:** Totalmente ausente (Contas a pagar/receber, comissões detalhadas, conciliação).
- **Central de Entrada:** Ausente (Upload e processamento de documentos).
- **IA:** Sem integração para OCR ou processamento de apólices.
- **Histórico/Timeline:** O perfil do cliente é apenas uma listagem, sem a timeline de eventos solicitada.
- **Produtos:** Atualmente usa um Enum fixo no banco, o usuário quer um cadastro gerenciável.
- **Cross-sell:** Lógica de oportunidades automáticas não implementada.

## 4. O que precisa ser corrigido
- **Segurança (RLS):** Precisa ser refinado para respeitar os novos cargos (Administrador, Corretor, etc.).
- **Schema de Clientes:** Adicionar campos faltantes como `whatsapp`, `number`, `complement`, `neighborhood`, `type` (PF/PJ).
- **Schema de Apólices:** Expandir campos (forma de pagamento, parcelas, comissão prevista, etc.).

## 5. Próximas Etapas (Plano de Evolução)
1. **Refatoração de Segurança:** Criar enums de cargos, tabela `user_roles`, função `has_role` e atualizar políticas RLS.
2. **Expansão do Schema:** Atualizar tabelas de `clients` e `policies` para suportar todos os campos da especificação.
3. **Módulo de Produtos:** Transformar o enum de produtos em uma tabela gerenciável.
4. **Financeiro Base:** Criar tabelas para Comissões e Contas a Pagar/Receber.
5. **Central de Entrada Inteligente:** Implementar UI de upload e estrutura de Storage.

---
Diagnóstico concluído. Pronto para iniciar a **ETAPA 2: Banco + Autenticação + Cargos + Permissões + RLS**.
