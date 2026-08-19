# Etapa 19 — CRM Comercial Completo e Ciclo de Vendas

Este plano visa consolidar o processo comercial da CoutSeg, transformando a tabela de oportunidades em um CRM robusto e auditável, garantindo o ciclo de vida completo do Lead até a Apólice/Renovação.

## 1. Mapeamento de Entidades e Status

*   **Lead:** Novos contatos ou prospectos. Serão armazenados na nova tabela `leads`.
*   **Oportunidade (`opportunities`):** Representa o interesse comercial. Pode originar-se de um Lead ou de um Cliente existente (Cross-sell/Renovação).
*   **Cotação (`quotes`):** Propostas de preços de diferentes seguradoras para uma Oportunidade.
*   **Proposta (`proposals`):** A cotação escolhida que foi enviada para emissão.
*   **Venda/Apólice (`policies`):** A concretização do negócio.

## 2. Mudanças no Banco de Dados (Supabase)

### Novas Tabelas e Enums
*   Criar tabela `leads` para prospectos (Nome, Email, Telefone, Status, Origem).
*   Criar tabela `quotes` vinculada a `opportunities` (Seguradora, Produto, Prêmio, PDF).
*   Adicionar colunas em `opportunities`: `lead_id`, `loss_reason`, `closed_at`, `value_estimated`, `value_realized`.
*   Criar tabela `crm_activities` para log de interações (chamada, reunião, observação).
*   Criar tabela `crm_history` para auditoria de mudanças de status e responsável.

### RLS e RBAC
*   Políticas granulares garantindo que corretores vejam apenas seus leads/oportunidades.
*   Admin/Gerente com visão total.

## 3. Implementação no Frontend

### Módulo de Leads
*   CRUD de Leads com verificação de duplicidade (CPF/Email/Telefone).
*   Fluxo de conversão: Lead -> Cliente + Oportunidade.

### Pipeline Comercial (Opportunities)
*   Refatorar a página de oportunidades para suportar o novo fluxo de funil.
*   Modal de "Perda de Oportunidade" exigindo motivo.
*   Modal de "Ganho" integrando com a criação da apólice no Cadastro Mestre.

### Gestão de Cotações e Propostas
*   Interface dentro da oportunidade para cadastrar múltiplas cotações.
*   Botão para "Aprovar Cotação" (transformar em Proposta).

### Auditoria e Histórico
*   Linha do tempo (Timeline) na visualização da oportunidade mostrando atividades e mudanças de status.

## 4. Integração e Dashboard
*   Atualizar o Dashboard (Etapa 18) para refletir as métricas de conversão reais (Lead -> Venda).
*   Alerta interno para oportunidades paradas há > 7 dias.

## Detalhes Técnicos
*   Utilizar `createServerFn` para lógica de conversão atômica (Transaction-like).
*   Garantir que a verificação de duplicidade use índices parciais no banco.
*   Manter a integridade do `product_id` e `insurer_id` conforme Cadastro Mestre.
