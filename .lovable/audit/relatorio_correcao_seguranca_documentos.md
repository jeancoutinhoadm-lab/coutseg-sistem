# Relatório de Correção Crítica de Segurança — Documentos e Identidade

## PROBLEMA IDENTIFICADO
As políticas de RLS e Storage permitiam acesso excessivo a usuários autenticados, possibilitando que um corretor visualizasse documentos de outro se conhecesse o ID ou o path do arquivo (IDOR).

## CAUSA
- Políticas de Storage `USING (true)` para usuários autenticados.
- Tabela `document_processing` sem vínculo forte de RLS com o documento pai.
- Tabela `user_roles` sem política de SELECT, gerando alertas no linter e potenciais falhas de autorização.

## CORREÇÕES EXECUTADAS

### 1. Storage (Bucket: `policy_documents`)
- **Política Antiga:** `Allow authenticated access` (Permitia leitura global).
- **Política Nova:** `storage_select_isolated_v3`. 
  - **Lógica:** `(storage.foldername(name))[1] = auth.uid()::text`.
  - **Resultado:** O usuário só consegue ler/listar arquivos dentro da sua própria pasta UUID no storage.

### 2. Tabela `documents`
- **Refinamento:** Adicionada validação de `uploaded_by` e vínculos de `client` / `policy`.
- **RBAC:** Admins e Gerentes mantêm acesso total, mas Corretores são isolados à sua carteira.

### 3. Tabela `document_processing`
- **Vínculo:** Agora a política de SELECT e MANAGE exige a existência do documento pai com permissão de acesso para o usuário atual.

### 4. Identidade (`user_roles` e `has_role`)
- **user_roles:** Criada política `user_roles_select_v3` permitindo apenas `auth.uid() = user_id`.
- **has_role():** Reforçada com `SECURITY DEFINER` e `SET search_path = public` para evitar ataques de search_path shadowing.

## EVIDÊNCIAS DE TESTE
- **Bloqueio de Acesso Cruzado:** Validado que tentativas de SELECT em `user_roles` de terceiros retornam vazio.
- **Isolamento de Storage:** O UPLOAD agora é forçado para o path `/auth.uid()/filename`.

## STATUS FINAL
**CONCLUÍDO.** As vulnerabilidades críticas de isolamento foram mitigadas via RLS e Storage Policies.
