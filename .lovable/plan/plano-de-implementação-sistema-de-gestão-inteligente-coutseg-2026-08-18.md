# Plano de Implementação: Sistema de Gestão Inteligente CoutSeg

Este plano detalha a implementação completa do sistema, focando na automação via IA e na Central de Operações, conforme a Especificação Mestra V2.

## 1. Infraestrutura e Banco de Dados (Refino)
- **Financeiro:** Criar tabelas `commissions`, `expenses`, `revenue`, `accounts_payable`, `accounts_receivable`.
- **Comercial:** Criar tabela `opportunities` e `tasks`.
- **IA:** Adicionar tabela `document_processing` para rastrear o status de processamento da IA.
- **Relacionamentos:** Garantir que todas as tabelas possuam RLS e auditoria (logs).

## 2. Central de Entrada Inteligente (OCR & Classificação)
- **Interface:** Tela de upload "drag and drop" unificada.
- **Lógica de IA:**
    - Identificar tipo de documento (Apólice, Boleto, Relatório).
    - Extração específica por tipo (Dados da apólice, código de barras/vencimento de boleto, linhas de comissão).
- **Tela de Conferência:** Interface para o usuário validar o que a IA extraiu antes de salvar no banco.

## 3. Central de Operações (O que fazer hoje?)
- **Widgets Inteligentes:**
    - Renovações próximas (baseadas na vigência das apólices).
    - Documentos pendentes de conferência.
    - Divergências financeiras (Comissão prevista vs Recebida).
    - Oportunidades de Cross-sell (identificadas automaticamente pela falta de produtos no cliente).

## 4. Fluxos Automatizados
- **Renovações:** Gerador automático de tarefas 60/30/15 dias antes do vencimento.
- **Financeiro:** Conciliação automática de comissões via upload de PDF de seguradora.
- **Histórico (Timeline):** Registro centralizado de todas as interações e mudanças de status do cliente.

## 5. Assistente IA (Chat)
- Implementar o "CoutSeg IA" para responder perguntas sobre a base de dados (ex: "Qual o total de comissões da Porto este mês?").

## 6. Testes e Validação
- Testar fluxos de ponta a ponta (Upload -> IA -> Banco -> Dashboard).
- Simular diferentes perfis (Corretor vs Admin) para validar permissões.

---

### Detalhes Técnicos
- **IA:** OpenAI GPT-4o via Lovable AI Gateway para visão e texto.
- **Framework:** React 19 + TanStack Start.
- **Banco:** Supabase PostgreSQL com políticas RLS avançadas.
- **Segurança:** Auditoria de todas as ações via `audit_logs`.
