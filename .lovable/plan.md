# Plano de Correção do Sistema de Autenticação

O usuário relatou dois problemas críticos: a tela de login apenas recarrega sem logar, e o botão de cadastro entra direto na aplicação sem solicitar dados. Este plano visa auditar e corrigir o fluxo completo, garantindo que a autenticação real do Supabase seja utilizada e que as rotas estejam devidamente protegidas.

## 1. Auditoria e Diagnóstico (Concluído/Em Andamento)
- [x] Verificar `src/routes/auth/login.tsx`: O formulário usa `react-hook-form` e `supabase.auth.signInWithPassword`. O problema de "recarregar" pode ser devido ao `window.location.href = "/dashboard"` ser chamado antes da sessão estar totalmente hidratada ou o `beforeLoad` do `/dashboard` redirecionar incorretamente.
- [x] Verificar `src/routes/auth/register.tsx`: Implementa `supabase.auth.signUp`. Precisa garantir que redirecione para uma tela de sucesso ou solicite confirmação.
- [x] Verificar `src/routes/_authenticated/route.tsx`: Implementa a proteção de rotas via `beforeLoad`.
- [x] Verificar `src/hooks/use-auth.ts`: Gerencia o estado da sessão e roles.

## 2. Correções no Frontend

### Tela de Login (`src/routes/auth/login.tsx`)
- Garantir que `onSubmit` chame `e.preventDefault()` (gerenciado pelo `handleSubmit` do react-hook-form).
- Melhorar o redirecionamento: usar `router.navigate` em vez de `window.location.href` para manter o estado da SPA, ou garantir que a sessão esteja pronta.
- Adicionar logs para identificar falhas silenciosas.

### Tela de Cadastro (`src/routes/auth/register.tsx`)
- Adicionar campo de confirmação de senha conforme solicitado.
- Garantir que após o `signUp`, o usuário veja uma mensagem clara de "Verifique seu e-mail" ou seja redirecionado corretamente.
- Impedir que o cadastro "pule" etapas.

### Proteção de Rotas (`src/routes/_authenticated/route.tsx` e `src/router.tsx`)
- O `beforeLoad` em `/_authenticated` já verifica `supabase.auth.getUser()`.
- O problema do "Cadastre-se" entrar direto pode ser um link incorreto ou uma rota pública que deveria ser privada. Verificarei se o link de cadastro no login está correto.
- Em `src/routes/auth/login.tsx`, o `beforeLoad` redireciona para `/dashboard` se logado. `/dashboard` redireciona para `/`. `/` está sob `_authenticated`. Isso parece correto, mas a cadeia de redirecionamentos pode estar causando o "reload" visual.

## 3. Correções no Backend (Supabase)
- A trigger `on_auth_user_created` em `public.profiles` atribui o cargo `broker` por padrão.
- A migração `20260818174003` criou `user_roles` e a função `has_role`.
- **Ação:** Criar uma trigger ou atualizar a existente para que novos usuários também ganhem uma entrada em `public.user_roles` com o cargo padrão `corretor` (ou similar), evitando que fiquem sem acesso.

## 4. Testes de Validação
- Executar os 12 testes obrigatórios listados pelo usuário usando scripts de teste ou verificação manual via preview.

## Detalhes Técnicos
- **Login:** Refatorar `onSubmit` para usar `router.navigate` e tratar erros de forma mais granular.
- **Cadastro:** Atualizar schema Zod para incluir `confirmPassword` e validação de igualdade.
- **Segurança:** Assegurar que `user_roles` não permita auto-atribuição de cargos via políticas RLS.
