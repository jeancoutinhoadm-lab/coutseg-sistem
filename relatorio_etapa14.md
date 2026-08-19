# RELATÓRIO DE AUDITORIA — ETAPA 14: CADASTRO MESTRE

## 1. MODELO DE DADOS (MAPA ATUAL)

| Entidade | Tabela | PK | FKs Principais | Unique / Constraints | Finalidade |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cliente** | `clients` | `id` | `broker_id` | `cpf_cnpj` (Unique), `type` (PF/PJ) | Fonte de verdade para segurados. |
| **Seguradora**| `insurers` | `id` | - | `cnpj` (Unique) | Cadastro oficial de companhias. |
| **Produto** | `products` | `id` | - | `name` (Auditado) | Catálogo de ramos de seguro. |
| **Apólice** | `policies` | `id` | `client_id`, `insurer_id` | `policy_number` (Não Unique só) | Vínculo contratual. |
| **Comissão** | `commissions`| `id` | `policy_id` | - | Gestão financeira de recebíveis. |
| **Documento** | `documents` | `id` | `client_id`, `policy_id` | - | Armazenamento de PDFs originais. |

---

## 2. RESULTADOS DA AUDITORIA

### 2.1 Clientes e Duplicidades
- **Registros Auditados:** 1 (Ambiente de Produção limpo).
- **Normalização de CPF/CNPJ:** Identificado que a constraint UNIQUE existe, mas não há trigger de limpeza automática no INSERT (ex: remover pontos/traços). **[MÉDIO]**
- **Candidatos a Duplicidade:** 0 encontrados.

### 2.2 Seguradoras e Aliases
- **Consistência de Nomes:** Apenas 1 seguradora de teste.
- **Mecanismo de Alias:** Não implementado no banco. Atualmente a IA tenta match por nome exato ou semelhança no código. **[ALTO]**

### 2.3 Produtos
- **Consistência:** 9 produtos padrão (Auto, Vida, etc).
- **Risco:** O campo `type` na tabela `policies` é um ENUM `policy_type`, enquanto existe uma tabela `products`. Isso cria uma **fonte de verdade duplicada**. **[CRÍTICO]**

### 2.4 Integridade Referencial (FKs)
- **Apólices:** `client_id` e `insurer_id` são `NOT NULL`. OK.
- **Comissões:** `policy_id` permite NULO no schema, mas é essencial para o motor de conciliação. **[ALTO]**
- **On Delete:** A maioria das tabelas usa `CASCADE`. Risco de perda de histórico financeiro se um cliente for excluído. **[CRÍTICO]**

---

## 3. PROBLEMAS IDENTIFICADOS E SOLUÇÕES

### [CRÍTICO] Risco de Perda de Histórico (Delete)
- **Descrição:** A exclusão de um cliente remove em cascata todas as apólices, documentos e comissões associadas.
- **Impacto:** Perda total de dados de auditoria e financeiro.
- **Arquivo/Tabela:** `public.clients`, `public.policies`, `public.commissions`.
- **Solução:** Alterar `ON DELETE CASCADE` para `ON DELETE RESTRICT` em tabelas financeiras ou implementar Soft Delete (`deleted_at`).

### [CRÍTICO] Duplicidade de Fonte de Verdade (Produtos)
- **Descrição:** O sistema usa um enum `policy_type` na tabela `policies` e também possui uma tabela `products`.
- **Impacto:** Inconsistência entre o que está cadastrado como produto e o que a apólice aceita.
- **Arquivo/Tabela:** `public.policies`.
- **Solução:** Adicionar `product_id` (FK) na tabela `policies` e migrar gradualmente do enum para a tabela.

### [ALTO] Falta de Aliases para IA
- **Descrição:** Se o PDF vier com "PORTO" e no banco estiver "PORTO SEGURO", o match pode falhar ou criar duplicata.
- **Impacto:** Falha na automação e sujeira no cadastro.
- **Solução:** Criar tabela `insurer_aliases` e `product_aliases`.

### [ALTO] Comissões Órfãs
- **Descrição:** Tabela `commissions` permite `policy_id` nulo.
- **Impacto:** Dificulta a conciliação e gera registros que ninguém sabe a origem.
- **Solução:** Tornar `policy_id` obrigatório (`NOT NULL`).

---

## 4. PRÓXIMOS PASSOS (ESTRATÉGIA DE CORREÇÃO)

1. **Migração de Segurança:** Alterar comportamentos de exclusão para proteger dados históricos.
2. **Normalização Automática:** Triggers para limpar CPF/CNPJ e Telefone no ato do INSERT/UPDATE.
3. **Mecanismo de Alias:** Criar tabelas de mapeamento para Seguradoras e Produtos para auxiliar a IA.
4. **Unificação de Produtos:** Vincular Apólices à tabela de Produtos oficial.

---
**Auditoria concluída em 19/08/2026.**
Aguardando instrução para iniciar as correções.
