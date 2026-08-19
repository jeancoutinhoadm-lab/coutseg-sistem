# ETAPA 26 — IMPLANTAÇÃO OPERACIONAL REAL DA COUTSEG

A CoutSeg Gestão foi homologada e está: **GO-LIVE READY COM RESSALVAS**.

A partir desta etapa, o objetivo é preparar o sistema para começar a receber dados reais de operação, mantendo a integridade e segurança.

## Objetivos Principais
- Configuração inicial da Corretora (Dados mestres).
- Cadastro de usuários reais via Supabase Auth.
- Execução de um Fluxo Piloto completo com dados controlados.
- Preparação do Plano de Migração da Carteira.

## 1. Configuração e Dados Mestres
- **Área Administrativa:** Verificar/ajustar configuração de nome, CNPJ, contato e endereço da corretora.
- **Seguradoras & Produtos:** Confirmar que `products` é a fonte oficial. Permitir aliases para matching de IA.
- **Usuários:** Cadastro de usuários reais com roles específicas (Admin, Gerente, Financeiro, Corretor).

## 2. Fluxo Piloto (Validação Real)
Validar a cadeia completa de dados:
`CLIENTE` → `LEAD` → `OPORTUNIDADE` → `COTAÇÃO` → `APÓLICE` → `DOCUMENTO` → `COMISSÃO` → `FINANCEIRO` → `RENOVAÇÃO` → `TAREFA`

## 3. Gestão de Documentos e IA
- **Privacidade:** Confirmar SHA-256 e Signed URLs de 60s.
- **IA:** Validar processamento sem alteração destrutiva de dados sem aprovação humana.

## 4. Plano de Migração (Final da Etapa)
Criar documento estratégico para importação da carteira real, incluindo estratégia de deduplicação e rollback.

## Technical Tasks
- [ ] Implementar página de Configurações da Corretora (Se não existir).
- [ ] Criar `checklist_primeiro_dia.md`.
- [ ] Realizar testes de permissões por cargo (Admin, Corretor, Financeiro).
- [ ] Gerar `.lovable/audit/relatorio_etapa26.md`.
