---
name: Security Audit Report
description: Comprehensive security and production readiness report.
type: reference
---

# RELATÓRIO DE AUDITORIA DE SEGURANÇA — COUTSEG

## 1. RLS (Row Level Security)
- **Status:** Habilitado em todas as tabelas principais.
- **Verificação:** Tabelas como `clients`, `policies` e `commissions` possuem políticas granulares separando ADMIN de CORRETOR.
- **Ponto de Atenção:** Algumas tabelas de configuração (`financial_categories`) possuem "Allow all for authenticated". Risco baixo, mas recomendável restringir UPDATE/DELETE para ADMIN.

## 2. RBAC (Cargos)
- **Status:** Implementado via `user_roles` e função `has_role`.
- **Integridade:** Uso de `SECURITY DEFINER` nas funções de checagem para evitar recursão.
- **Correção Necessária:** Garantir `SET search_path` em todas as funções SQL.

## 3. STORAGE & DOCUMENTOS
- **Bucket:** `policy_documents` configurado como privado.
- **Signed URLs:** Implementadas com duração de 60 segundos.
- **SHA-256:** Hash único por arquivo para evitar duplicidade silenciosa.

## 4. IA & SECRETS
- **Secrets:** `LOVABLE_API_KEY` isolada em `process.env` dentro de `createServerFn`. Não vaza para o bundle do cliente.
- **Read-Only IA:** O prompt do Assistente Analítico proíbe explicitamente ações de escrita.

## 5. FINANCEIRO
- **Fechamento:** Travas em `financial_periods` impedem escrita em meses fechados via Trigger.
- **Idempotência:** Funções de pagamento validam status antes de processar.

## 6. LGPD
- **Dados:** Armazenamento de Nome, CPF/CNPJ, e-mail e telefone.
- **Controle:** Acesso restrito via RLS baseado no vínculo do Corretor ou cargo Administrativo.
