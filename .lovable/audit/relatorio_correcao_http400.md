# Relatório de Correção: Erros HTTP 400 (PostgREST)

**Data:** 20/08/2026
**Status:** CONCLUÍDO

## 1. TASKS

**Requisição Original:**
`GET /rest/v1/tasks?select=*,responsible:profiles!tasks_user_id_fkey(full_name),...&order=due_date.asc`

**Erro HTTP Real:**
`400 Bad Request`

**Mensagem Original do PostgREST:**
`{"code":"PGRST200","details":"Searched for a foreign key relationship between 'tasks' and 'profiles' using the hint 'tasks_user_id_fkey' in the schema 'public', but no matches were found.","hint":"Perhaps you meant 'payables' instead of 'profiles'.","message":"Could not find a relationship between 'tasks' and 'profiles' in the schema cache"}`

**Causa Raiz:**
A query utilizava o hint `tasks_user_id_fkey`, que aponta para a tabela `auth.users`, não para a tabela `public.profiles`. O PostgREST falhava ao tentar resolver a relação inexistente entre `tasks` e `profiles` através dessa chave estrangeira, resultando em erro 400.

**Correção Aplicada:**
1. Criada chave estrangeira explícita `tasks_user_id_profiles_fkey` apontando de `tasks(user_id)` para `profiles(id)`.
2. Atualizado o código frontend para utilizar o novo hint `profiles!tasks_user_id_profiles_fkey`.
3. Adicionados `GRANT SELECT` explícitos para a role `authenticated` nas tabelas envolvidas.

**Teste Realizado:**
Execução da query via Python script simulando o ambiente PostgREST.

**Resultado:**
`Status: 200 OK` (Vazio, mas sem erro de sintaxe/esquema).

---

## 2. POLICIES (Central de Renovações)

**Requisição Original:**
`GET /rest/v1/policies?select=*,profiles:responsible_user_id(full_name)&order=end_date.asc`

**Erro HTTP Real:**
`400 Bad Request`

**Mensagem Original do PostgREST:**
`{"code":"PGRST200","details":"Searched for a foreign key relationship between 'policies' and 'responsible_user_id' in the schema 'public', but no matches were found.","message":"Could not find a relationship between 'policies' and 'responsible_user_id' in the schema cache"}`

**Causa Raiz:**
A query tentava fazer um join usando `responsible_user_id` como se fosse um nome de tabela ou um alias de relação não definido. A relação real aponta para `auth.users`, o que impede o join direto com `public.profiles` no PostgREST sem uma FK explícita na camada `public`.

**Correção Aplicada:**
1. Criada chave estrangeira explícita `policies_responsible_user_id_profiles_fkey` apontando de `policies(responsible_user_id)` para `profiles(id)`.
2. Atualizado o código frontend para utilizar `profiles:profiles!policies_responsible_user_id_profiles_fkey(full_name)`.
3. Garantidos `GRANT SELECT` para a role `authenticated`.

**Teste Realizado:**
Execução da query via Python script.

**Resultado:**
`Status: 200 OK`.

---

## 3. SEGURANÇA E CONFORMIDADE

- **RLS:** Nenhuma política foi alterada ou removida.
- **RBAC:** Nenhuma permissão de cargo foi relaxada.
- **Storage:** Sem alterações.
- **Isolamento:** Mantido via RLS existente.
- **IA:** Permanece Read-only e resiliente.
- **Financeiro:** Protegido por RLS e GRANTS adequados.

## 4. CONCLUSÃO

Os erros 400 foram causados por deficiências no esquema de banco de dados (falta de chaves estrangeiras explícitas para a tabela `profiles`) que impediam o PostgREST de resolver os joins solicitados pelo frontend. A correção estabiliza o Dashboard, Central de Tarefas e Renovações sem comprometer a segurança.
