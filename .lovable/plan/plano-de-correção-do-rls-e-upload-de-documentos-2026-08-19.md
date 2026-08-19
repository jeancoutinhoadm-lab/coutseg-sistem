# Plano de Correção do RLS e Upload de Documentos

Este plano visa corrigir o erro `new row violates row-level security policy for table "documents"`, garantindo um fluxo de upload seguro e resiliente, conforme as especificações.

## 1. Correção do Banco de Dados (RLS)

Criar uma nova migração SQL para:
- Remover políticas inseguras ou permissivas demais (ex: `USING (bucket_id = 'policy_documents')` sem checagem de usuário).
- Implementar políticas granulares na tabela `public.documents`:
    - **INSERT**: Apenas se `uploaded_by = auth.uid()`.
    - **SELECT**: Se for o `uploaded_by` OU se o usuário possuir cargos administrativos (`admin`, `gerente`, etc) OU se houver vínculo com cliente/apólice atribuído a ele (para corretores).
    - **UPDATE/DELETE**: Restrito ao dono do documento ou administradores.
- Implementar políticas granulares no Storage (`storage.objects`):
    - **INSERT**: Apenas no bucket `policy_documents` se o caminho começar com o `auth.uid()` do usuário.
    - **SELECT/DELETE**: Apenas se o usuário for o dono (baseado no caminho do arquivo `{user_id}/...`) ou se possuir cargo administrativo.

## 2. Ajustes no Frontend

Refatorar `src/routes/_authenticated/central-entrada.tsx`:
- **Caminho do Arquivo**: Alterar o upload para usar a estrutura `{user_id}/{uuid}.{ext}`, garantindo isolamento no storage.
- **Vínculo de Usuário**: Garantir que o `uploaded_by` seja SEMPRE preenchido com o ID retornado pelo `supabase.auth.getUser()` no momento do `INSERT`.
- **Tratamento de Erros**: Melhorar o feedback visual e garantir que falhas de RLS sejam reportadas claramente.
- **Rollback Manual**: Se o `INSERT` na tabela `documents` falhar, tentar remover o arquivo recém-subido do Storage para evitar arquivos órfãos.

## 3. Validação e Segurança

- Verificar se não há uso de `service_role` ou chaves administrativas no frontend.
- Executar os 6 testes obrigatórios descritos na solicitação (Upload, Visualização Própria, Acesso Negado a Terceiros, Falsificação de Identidade, Acesso Não Autenticado, Checagem de Políticas Permissivas).

## Detalhes Técnicos

- Tabela: `public.documents`
- Bucket: `policy_documents`
- Cargos envolvidos: `admin`, `gerente`, `administrativo`, `financeiro`, `corretor`.
- Lógica de path: `policy_documents/{auth.uid()}/{filename}`.
