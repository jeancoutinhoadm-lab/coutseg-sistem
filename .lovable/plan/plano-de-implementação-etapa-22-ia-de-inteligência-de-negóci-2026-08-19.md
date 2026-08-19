# Plano de Implementação - Etapa 22: IA de Inteligência de Negócio da CoutSeg

Este plano estabelece a base para o Assistente Analítico Interno, focando em extração de insights, detecção de anomalias e recomendações assistidas, respeitando a soberania da decisão humana e a segurança dos dados.

## 1. Infraestrutura de Dados e Segurança
- [ ] Criar tabela `business_insights` para armazenamento persistente de análises.
- [ ] Implementar RLS na `business_insights` vinculada aos escopos de usuários e `user_roles`.
- [ ] Criar função `get_business_context` em `src/lib/ai.server.ts` para sanitização de dados antes do envio para LLM (mascaramento de PII).

## 2. Camada Determinística (Regras de Negócio)
- [ ] Implementar motor de Cross-Sell em `src/lib/business-rules.functions.ts` (ex: Auto sem Residencial).
- [ ] Implementar detetor de Risco de Renovação (Elegível em 30 dias AND sem atividade/tarefa).
- [ ] Implementar monitor de Oportunidades Paradas (Open status AND sem atividade > X dias).
- [ ] Implementar travas de Divergência Financeira (Esperado vs Recebido).

## 3. Assistente Analítico (IA Assistiva)
- [ ] Criar `src/lib/business-ai.functions.ts` para chamadas ao GPT-4o.
- [ ] Implementar `askBusinessIA`: server function para perguntas sobre indicadores (apenas leitura).
- [ ] Desenvolver prompt estruturado que proíba instruções de alteração de dados (Proteção contra Injection).
- [ ] Implementar sistema de "Explicação de Recomendação" (Why this suggestion?).

## 4. Interface do Usuário
- [ ] Criar área "Inteligência da CoutSeg" no Dashboard Executivo.
- [ ] Desenvolver Feed de Insights com filtros por severidade e tipo.
- [ ] Adicionar componente de Chat Analítico para perguntas sobre o contexto da corretora.
- [ ] Implementar mecanismo de Feedback (Útil/Não Útil) e Auditoria de Visualização.

## Detalhes Técnicos
- **Database**: Nova tabela `business_insights` com colunas `type`, `severity`, `entity_related`, `description`, `evidence`.
- **IA**: GPT-4o com `temperature: 0` para máxima precisão e mínima alucinação.
- **Segurança**: IA só recebe agregações e IDs anonimizados, nunca o banco completo.
- **Performance**: Insights calculados em background ou sob demanda com cache de 1 hora.

```text
DADOS (Postgres) -> AGREGADOR (Server Function) -> IA (LLM) -> INSIGHT (UI) -> AÇÃO (HUMANO)
```
