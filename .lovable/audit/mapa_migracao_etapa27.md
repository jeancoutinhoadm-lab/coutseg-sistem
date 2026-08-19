# Mapa de Migração da Carteira Real (Etapa 27)

## 1. FONTES DE DADOS IDENTIFICADAS
- **Planilhas Operacionais:** Arquivos Excel/CSV contendo a listagem atual de clientes e apólices.
- **Documentos Locais:** PDFs de apólices e endossos armazenados em pastas.
- **Extratos de Comissões:** PDFs e arquivos de texto das seguradoras (Porto, Azul, Bradesco, etc.).
- **CRM Anterior:** Exportação de leads e histórico de interações (se disponível).

## 2. ESTRUTURA DE CLIENTES
- **Identificador Único:** CPF ou CNPJ.
- **Campos:** Nome Completo, Email, Telefone, Tipo (Física/Jurídica), Status.
- **Regra de Deduplicação:** 
    - Nível 1: CPF/CNPJ Exato.
    - Nível 2: Nome Fonético + Email (Sinalizar para revisão).

## 3. CADASTRO MESTRE (MAPA DE ALIASES)
- **Seguradoras:**
    - Porto Seguro, Porto, Porto Seg -> `ID_PORTO_SEGURO`
    - Bradesco Seguros, Bradesco -> `ID_BRADESCO`
    - Azul Seguros, Azul -> `ID_AZUL`
- **Produtos:**
    - Auto, Automóvel, RCF -> `ID_AUTO`
    - RE, Residencial -> `ID_RESIDENCIAL`

## 4. ESTRATÉGIA DE LOTES
1. **Lote 1 (Infra):** Seguradoras e Produtos (Cadastro Mestre).
2. **Lote 2 (Base):** Clientes (Validação de CPF/CNPJ).
3. **Lote 3 (Contratos):** Apólices (Vínculo com Lote 1 e 2).
4. **Lote 4 (Digital):** Documentos (Upload com Hash SHA-256).
5. **Lote 5 (Financeiro):** Saldos Iniciais e Comissões Pendentes.

## 5. REGRAS DE INTEGRIDADE
- Nenhuma apólice sem cliente.
- Nenhuma comissão sem apólice.
- Datas tratadas via `src/lib/date-utils.ts` para evitar erro de timezone.

## 6. DADOS INCOMPLETOS (QUARENTENA)
Registros que falharem na validação serão movidos para uma tabela de `migration_quarantine` para correção manual, nunca descartados silenciosamente.
