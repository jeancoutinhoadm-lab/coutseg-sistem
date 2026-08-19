# Etapa 25.1 — Validação Real das Lacunas do Go-Live

Este documento detalha o plano de validação prática para preencher as lacunas do relatório de Go-Live, diferenciando o que foi testado, o que foi verificado por código e o que não foi testado.

## 1. Segurança e RLS/RBAC (Autorização Real)
- **Ação:** Executar testes reais de autorização simulando diferentes cargos (ADMIN, GERENTE, CORRETOR_A, CORRETOR_B, FINANCEIRO, ADMINISTRATIVO).
- **Escopo:** Acesso cruzado a `clients`, `leads`, `opportunities`, `crm_activities`, `policies`, `documents`, `tasks`, `commissions`, e `financial records`.
- **Registro:** Diferenciar "TESTADO E PASSOU", "TESTADO E FALHOU" e "NÃO FOI POSSÍVEL TESTAR".

## 2. Testes de IDOR e Storage
- **IDOR:** Tentar acesso manual a IDs de outros corretores (`client_id`, `policy_id`, etc.).
- **Storage:** Validar bucket privado, expiração de Signed URLs (60s) e negação de acesso sem autenticação.

## 3. Integridade Financeira e Travas
- **Período Fechado:** Testar tentativas de INSERT/UPDATE/DELETE em meses com `financial_periods.is_closed = true`.
- **Pagamentos:** Testar idempotência (evitar duplicidade) e consistência de estornos.
- **Comissões:** Validar trava de aprovação sem justificativa para valores divergentes.

## 4. IA e Infraestrutura
- **IA Read-Only:** Confirmar tecnicamente que as funções de IA não possuem permissões de escrita (INSERT/UPDATE/DELETE) em dados de negócio.
- **Secrets:** Verificar bundle client-side para garantir que nenhuma chave privada (`SERVICE_ROLE`, `OPENAI_API_KEY`, etc.) está exposta.
- **Backup & Rollback:** Documentar provedor, frequência e retenção. Registrar status de teste de restore/rollback (TESTADO ou NÃO TESTADO).

## 5. Fluxo End-to-End e Fidelidade de Dados
- **E2E:** Executar fluxo completo desde Login até Relatórios/Dashboard.
- **Diferença de Dados:** Comparar números do Dashboard/Relatórios diretamente com queries SQL no banco.
- **Performance & Mobile:** Registrar tempos de resposta reais e validar se o teste mobile foi físico ou apenas simulação de CSS.

## 6. Resultados e Decisão Final
- **Relatórios:** Atualizar `.lovable/audit/relatorio_go_live_etapa25.md` e criar `.lovable/audit/relatorio_validacao_25_1.md`.
- **Decisão:** Status final (GO-LIVE READY, COM RESSALVAS ou BLOCKED) e resposta à pergunta "Pode receber dados reais?".
