# Auditoria do Projeto Coutseg Gestão

## 1. O que já existe
- **Base Tecnológica:** React 19, TypeScript, TanStack Start v1, Tailwind CSS v4, Lucide React, Shadcn UI.
- **Backend:** Supabase (Lovable Cloud) com tabelas iniciais e RLS básico.
- **Estrutura de Rotas:** 
  - `/auth/login` e `/auth/register`.
  - Layout Protegido `_authenticated`.
  - Telas iniciais: Dashboard, Clientes, Apólices, Seguradoras, Corretores, Sinistros e Renovações.
- **Funcionalidades:** CRUD básico funcional para as entidades principais.

## 2. O que funciona
- Fluxo de autenticação completo.
- Sidebar com navegação funcional.
- Listagem e criação de registros (Clientes, Apólices, etc.).
- Dashboard com resumo de métricas e lista de renovações próximas (30 dias).

## 3. O que está incompleto / Precisa ser melhorado
- **Cargos (Roles):** Atualmente usa uma coluna `role` na tabela `profiles`. Precisa migrar para a arquitetura de cargos granulares (`admin`, `corretor`, `administrativo`, `financeiro`, `gerente`) com a tabela `user_roles` e função `has_role`.
- **Isolamento de Dados (RLS):** As políticas atuais são globais para usuários autenticados. O cargo `corretor` deve visualizar apenas seus próprios clientes e apólices.
- **Schema de Dados:** Faltam campos detalhados na especificação (WhatsApp, endereço completo com bairro/número, tipo PF/PJ, financeiro da apólice).
- **Entidades Faltantes:** Módulo de `produtos` (tabela), `documentos` (Storage), `comissões`, `tarefas`, `oportunidades` e `contas a pagar`.
- **Inteligência:** Central de Entrada (OCR/IA) e Central de Operações (Alertas baseados em cargo).

## 4. O que precisa ser corrigido
- **Segurança:** Refinar RLS para evitar que um corretor veja dados de outro.
- **Frontend:** Adicionar validação de CPF/CNPJ único para clientes.

## 5. Próximo Passo Sugerido
- **ETAPA 2:** Refatoração da Segurança (Cargos e RLS Granular).

---
Diagnóstico concluído. A fundação está pronta, mas o sistema precisa agora de "musculatura" e inteligência para ser uma ferramenta operacional real.
