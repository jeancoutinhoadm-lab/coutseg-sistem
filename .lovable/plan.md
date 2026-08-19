# Plano de Correção Crítica de Segurança — Documentos, IA e RBAC

## 1. Diagnóstico de Riscos
- **Storage:** A política `Allow authenticated access to policy_documents` permite que qualquer usuário logado veja/baixe qualquer arquivo se souber o nome, violando o isolamento entre corretores.
- **document_processing:** A política atual vincula apenas ao `uploaded_by` do documento original, mas não restringe adequadamente o acesso via RBAC para outros papéis (ex: financeiro só deve ver o que lhe compete).
- **user_roles:** Falta política de SELECT, o que pode impedir o funcionamento correto do `has_role()` em contextos restritos ou permitir leitura indevida se aberta demais.
- **has_role():** Precisa ser validada para garantir que não sofra bypass e que o `search_path` esteja correto.

## 2. Implementação Técnica

### Lote 1: Reforço do Storage (policy_documents)
- Revogar políticas genéricas.
- Implementar política baseada em `(storage.foldername(name))[1] = auth.uid()::text` para UPLOAD.
- Implementar política de SELECT/DELETE que valida o `auth.uid()` contra o path OU verifica se o usuário tem role `admin`/`gerente`.

### Lote 2: Proteção da Tabela `documents` e `document_processing`
- Ajustar RLS de `documents` para garantir que um corretor só veja documentos vinculados aos seus clientes/apólices.
- Ajustar RLS de `document_processing` para seguir estritamente o acesso do documento pai.
- Impedir IDOR (Insecure Direct Object Reference) validando a posse do registro antes de qualquer download/update.

### Lote 3: Segurança de Identidade (`user_roles` e `has_role`)
- Criar política de SELECT em `user_roles` limitada a `auth.uid() = user_id`.
- Revisar `has_role()` para `SECURITY DEFINER` com `SET search_path = public`.

### Lote 4: Validação e Testes de Isolamento
- Executar scripts de teste simulando diferentes papéis (Admin, Corretor A, Corretor B).
- Validar bloqueio de acesso cruzado (Corretor A tentando ler Documento B).

## 3. Relatório de Auditoria
- Criar `.lovable/audit/relatorio_correcao_seguranca_documentos.md` com evidências.

## 4. Checklist de Aprovação (Definição de Pronto)
- [ ] Bloqueio de acesso cruzado entre corretores (A não vê B).
- [ ] Upload restrito ao path do próprio usuário.
- [ ] Signed URLs funcionando com expiração curta.
- [ ] user_roles protegido contra leitura externa.
- [ ] Auditoria de segurança sem avisos de "No SELECT policy".
