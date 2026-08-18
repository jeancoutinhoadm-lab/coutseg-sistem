# Auditoria do Projeto Coutseg Gestão

## 1. O que já existe
- **Infraestrutura:** Baseada em TanStack Start v1 (React 19, Vite 7), Tailwind CSS v4, e Lovable Cloud (Supabase).
- **Autenticação:** Sistema funcional com login/registro via e-mail/senha e Google.
- **Segurança (RLS):** Refatoração de cargos (`admin`, `corretor`, etc.) e políticas de segurança implementadas em nível de banco de dados.
- **Módulos Básicos:** Clientes, Apólices, Seguradoras, Corretores, Sinistros e Renovações.
- **Auditoria:** Sistema de logs (`audit_logs`) registrando ações de CRUD e acessos.
- **UI:** Layout responsivo com Sidebar, Dashboard personalizado por cargo e modais para operações.

## 2. O que funciona
- Login e redirecionamento baseado em cargo.
- Listagem, busca, criação e edição de clientes, apólices, seguradoras e corretores.
- Dashboard com estatísticas globais (Admin) ou específicas (Corretor).
- Alertas de renovação para os próximos 30 dias.
- Registro automático de logs de auditoria no banco.

## 3. O que está incompleto (conforme especificação mestra)
- **Central de Operações:** O dashboard atual é estático e generalista; não responde "O que eu preciso fazer hoje?" com ações específicas (Urgente, Pendente, Financeiro).
- **Central de Entrada:** Não existe interface para upload em massa e processamento de documentos.
- **Produtos:** Cadastro de produtos está misturado em enums, sem uma tabela dedicada e flexível.
- **IA:** Arquitetura para OCR e interpretação de documentos ainda não foi iniciada.
- **Financeiro:** Comissões previstas vs. recebidas, contas a pagar/receber e repasses não estão implementados.
- **Perfil do Cliente:** Falta a visão 360º com timeline histórica.
- **Documentos:** Falta integração com Supabase Storage e gestão de arquivos vinculados.

## 4. O que precisa ser corrigido
- **Tipagem de Enums:** Alguns enums no frontend (ex: `policy_type`) estão limitados e precisam ser expandidos conforme a especificação ou movidos para tabelas.
- **Fluxo de Dados:** O sistema ainda exige muita digitação manual; a transição para o fluxo "Upload -> IA" é a prioridade.

## 5. O que precisa ser criado (Próximos Passos Prioritários)
- **Tabela `products`:** Para permitir cadastro dinâmico pelo Admin.
- **Central de Entrada (UI):** Tela para upload e visualização do status de processamento.
- **Integração Storage:** Configuração de buckets para apólices e comprovantes.
- **Financeiro Base:** Tabelas para comissões e conciliação.

## 6. Alterações de Banco Necessárias (Etapa 3/4)
- Criação da tabela `public.products`.
- Criação da tabela `public.documents` vinculada ao Storage.
- Expansão da tabela `public.policies` para incluir campos de pagamento e comissão prevista.

## 7. Riscos
- **Complexidade da IA:** A extração de dados de PDFs variados (diferentes seguradoras) exigirá prompts de IA robustos.
- **Sincronização Financeira:** A conciliação de comissões depende da qualidade da extração de dados dos relatórios das seguradoras.

## 8. Próximo Passo
**Etapa 3:** Implementação do cadastro de **Produtos** e melhoria no cadastro de **Clientes** (evitar duplicação por CPF/CNPJ e campos adicionais de endereço).
