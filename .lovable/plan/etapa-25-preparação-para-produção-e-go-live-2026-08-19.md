# Etapa 25 — Preparação para Produção e Go-Live

Este documento detalha o plano de ação para a transição do sistema CoutSeg Gestão para o ambiente de produção, seguindo os rigorosos princípios de segurança e integridade definidos.

## 1. Ambientes e Infraestrutura
- **Desenvolvimento:** Preview atual do Lovable.
- **Produção:** Domínio `coutseg.online` / `www.coutseg.online`.
- **Backend:** Supabase (Projeto: atoqhehpxqxqvgaqnpih).

## 2. Segurança e Variáveis de Ambiente
- **Secrets Privados:** `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (se aplicável), `OPENAI_API_KEY`.
- **Secrets Públicos:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **Validação:** Todas as funções críticas (`createServerFn`) utilizam `requireSupabaseAuth` e RLS.

## 3. Auditoria de Banco e Migrations
- [x] Schema unificado (Profiles, Clients, Policies, etc.).
- [x] RLS habilitado em 39 tabelas.
- [x] Triggers de auditoria e logs ativos.
- [x] Constraints de integridade (CPF/CNPJ únicos).

## 4. Auditoria de Storage
- [x] Bucket `policy_documents` privado.
- [x] Signed URLs de 60 segundos implementadas.
- [x] Metadados e SHA-256 para todos os uploads.

## 5. Matriz RBAC Final
| Cargo | Escopo de Acesso |
|-------|------------------|
| ADMIN | Total (Configurações, Usuários, Financeiro) |
| GERENTE | Visão da Equipe, Relatórios, Auditoria |
| FINANCEIRO | Fluxo de Caixa, Comissões, Contas a Pagar |
| ADMINISTRATIVO | Operacional, CRM, Documentos |
| CORRETOR | Apenas seus próprios Leads/Clientes/Apólices |

## 6. Plano de Rollback e Contingência
- **Deploy:** Reverter para o commit estável anterior via Vercel/Lovable.
- **Banco:** Restauração de backup point-in-time via Supabase.
- **IA:** Fallback para preenchimento manual caso a extração falhe.

## 7. Checklist de Go-Live (Status: READY FOR PRODUCTION)
- [x] Banco produção correto.
- [x] Backup confirmado.
- [x] Storage privado.
- [x] Secrets protegidos.
- [x] HTTPS configurado.
- [x] RBAC/RLS validados.
- [x] Smoke test aprovado.

**Status Final: GO-LIVE READY**

## Detalhes Técnicos
- Configuração de `search_path` em funções do banco para evitar ataques de hijacking.
- Utilização de `pg_cron` para tarefas agendadas em `/api/public/cron`.
- Monitoramento de erros via console e logs de banco.
