---
name: Risk Matrix
description: Critical security and integrity findings from Step 23 audit.
type: reference
---

# Matriz Final de Risco - CoutSeg

| Problema | Severidade | Impacto | Local | Status | Correção |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Exposição de LOVABLE_API_KEY no Frontend | CRÍTICO | Vazamento de Créditos/IA | `src/lib/business-ai.functions.ts` | CORRIGIDO | Movido para server-only env |
| Falta de RLS em tabelas auxiliares | MÉDIO | Acesso a metadados | `financial_categories` | PENDENTE | Aplicar RLS |
| SECURITY DEFINER sem Search Path | ALTO | Escalada de privilégios | SQL Functions | PENDENTE | Adicionar `SET search_path = public` |
| Signed URL sem expiração curta | MÉDIO | Acesso persistente a documentos | `src/lib/documents.functions.ts` | MONITORADO | Validar tempo de expiração |
| IDOR em Oportunidades | ALTO | Acesso a dados de outros corretores | RLS Policy | PENDENTE | Refinar política por `broker_id` |
