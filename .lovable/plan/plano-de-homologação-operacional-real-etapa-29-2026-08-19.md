# Plano de Homologação Operacional Real (Etapa 29)

Este plano visa realizar uma auditoria e validação realista da **Central de Operações** (Etapa 28) através de 9 cenários de homologação que simulam o dia a dia da CoutSeg, focando na estratégia de **Migração Orgânica**.

## Objetivos
1.  **Validar Fluxos Reais:** Testar desde o papel (cliente novo) até a renovação e endosso.
2.  **Garantir Reaproveitamento:** Aplicar a "Regra de Ouro" (não redigitar o que já existe).
3.  **Auditoria de Integridade:** Verificar se RLS, Idempotência e Histórico permanecem íntegros.
4.  **Avaliar Experiência (UX):** Medir rapidez e fricção operacional.

## Ações

### 1. Infraestrutura de Teste
- Criar `.lovable/audit/relatorio_etapa29.md` para registro formal dos cenários.
- Expandir `src/lib/test-data.functions.ts` com um motor de homologação (`runHomologationStep29`) que executa os 7 primeiros cenários programaticamente para validação de integridade.

### 2. Execução dos Cenários
- **Cenário 1 (Papel -> Renovação):** Criar cliente fantasma -> Iniciar op renovação -> Criar apólice -> Documento -> Checklist.
- **Cenário 2 (Cross-sell):** Cliente Auto -> Adicionar Residencial -> Validar CRM e Unicidade.
- **Cenário 3 (Renovação recorrente):** Localizar apólice anterior -> Reaproveitar dados -> Gerar nova vigência.
- **Cenário 4 (Venda Nova completa):** Fluxo Lead -> Oportunidade -> Cotação -> Apólice -> Financeiro.
- **Cenário 5 & 6 (Endosso e Cancelamento):** Testar integridade histórica e motivos obrigatórios.
- **Cenário 7 (Duplicidade):** Tentar forçar CPF duplicado e apólices idênticas.

### 3. Frontend e UX
- Atualizar `src/routes/_authenticated/index.tsx` para refletir o status da Etapa 29.
- Implementar botões de "Executar Homologação" (apenas para Admin) para facilitar a validação.

### 4. Relatório e Diagnóstico
- Analisar quantidade de telas e campos para cada cenário.
- Gerar diagnóstico final: **SIM**, **SIM COM RESSALVAS** ou **NÃO**.

## Detalhes Técnicos
- Utilizar `createServerFn` para as validações de backend.
- Manter RLS estrito durante os testes de permissão (Cenário 8).
- As datas serão normalizadas usando `parseSafeDate` (Etapa 27).
