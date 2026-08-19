# Relatório de Auditoria — Etapa 13 (Auditoria da Etapa 12)

## 1. BUILD E ROTAS
- **Build**: [EXECUTANDO]
- **Typecheck**: [EXECUTANDO]
- **Lint**: [EXECUTANDO]
- **Route Crawler**: Rota `/opportunities` identificada e corrigida (removido `as any`).

## 2. CENTRAL DE RENOVAÇÕES
- **Cálculo de Vencimento**: Verificando uso de `differenceInDays` e timezones.
- **Timezone**: A aplicação deve garantir consistência entre o vencimento salvo no DB (Date) e a exibição local.
- **Filtros**: Verificando faixas de 7, 15, 30 dias e vencidas.

## 3. OPORTUNIDADES
- **Regras**: Verificando lógica de gatilho Auto -> Residencial.
- **Duplicidade**: Verificando se recria oportunidades rejeitadas ou existentes.
- **Evidência**: Verificando clareza do texto gerado.

## 4. SEGURANÇA (RLS)
- **Cargos**: Testando se Corretores estão isolados.
- **Permissões**: Validando se Financeiro/Administrativo acessam o que devem.

## 5. PERFORMANCE
- **Queries**: Analisando se há N+1 na listagem de renovações.

---
*Este relatório será atualizado conforme os testes avançam.*
