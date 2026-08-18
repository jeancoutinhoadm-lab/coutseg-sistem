# Plano de Verificação e Ajustes Finais - CoutSeg Gestão

O sistema CoutSeg foi transformado em uma plataforma inteligente de "digitação mínima". Este plano foca na validação final da integração de IA, segurança RLS e UX.

## 1. Validação de Fluxos IA
- [ ] **Central de Entrada**: Testar upload de PDF/Imagem simulando Apólice e Boleto.
- [ ] **Extração**: Verificar se o prompt do `ai-extraction.functions.ts` está retornando JSON limpo e se o mapeamento de Seguradora/Cliente no frontend é resiliente a variações de nome.
- [ ] **Assistente CoutSeg IA**: Validar se o chatbot global responde corretamente sobre as capacidades do sistema.

## 2. Integridade de Dados e Backend
- [ ] **Triggers de Comissão**: Confirmar se a criação de uma apólice via IA dispara a criação da comissão pendente (via SQL trigger).
- [ ] **Auditoria**: Verificar se ações de IA e financeiras estão sendo registradas na `audit_logs`.
- [ ] **Segurança por Cargo**: Revisar políticas RLS para garantir que Corretores não vejam dados financeiros globais (Salários/Receitas).

## 3. Refinos de Interface (UX)
- [ ] **Dashboard Principal**: Garantir que os contadores de "Urgente/Pendente" reflitam dados reais do banco.
- [ ] **Renovações**: Validar o cálculo de dias restantes e a coloração visual (Vermelho para < 15 dias).
- [ ] **Sidebar**: Confirmar se a visibilidade dos itens de menu respeita estritamente o cargo do usuário logado.

## Detalhes Técnicos
- **IA**: Utilizando `gpt-4o` via Lovable AI Gateway.
- **Banco**: Tabelas normalizadas com RLS ativado e função `has_role` para controle de acesso.
- **Frontend**: TanStack Start v1 com Query/Router para estados assíncronos e navegação.
