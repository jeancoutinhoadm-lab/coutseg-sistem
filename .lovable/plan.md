# Migração da IA para Google Gemini direto

## Objetivo
Substituir todas as chamadas ao Lovable AI Gateway pela API oficial do Google Gemini, usando exclusivamente `GEMINI_API_KEY` no servidor, sem fallback e sem alterar RLS, RBAC, Storage ou permissões.

## Implementação
1. Criar um cliente Gemini compartilhado e exclusivo do servidor para:
   - ler `GEMINI_API_KEY` somente durante cada chamada;
   - enviar texto, imagens e PDFs à API oficial;
   - solicitar JSON estruturado com schema nas extrações;
   - validar MIME, tamanho e formato da resposta;
   - traduzir erros de autenticação, permissão, quota, limite, timeout, modelo e arquivo em mensagens seguras.
2. Migrar todas as funções identificadas:
   - extração geral de apólices, boletos, contas e documentos;
   - extração de relatórios de comissão;
   - análise de documento auxiliar;
   - Assistente Analítico do dashboard;
   - chat da CoutSeg.
3. Corrigir o fluxo real de documentos:
   - remover o modo simulado usado pela Central de Entrada;
   - enviar o PDF original ou imagem ao servidor para leitura direta pelo Gemini;
   - manter o arquivo original salvo e preservar a revisão humana antes da confirmação no banco;
   - manter compatibilidade com o formulário atual de apólices.
4. Atualizar os testes de resiliência para o formato de resposta e erros da API oficial.
5. Verificar por busca global que nenhuma função de IA restante usa `LOVABLE_API_KEY` ou endpoints Lovable, sem remover a secret existente.

## Validação
- Executar testes focados das funções migradas.
- Fazer uma chamada real simples pelo mesmo cliente do servidor e registrar apenas endpoint, modelo, status e resposta não sensível.
- Verificar que nenhum nome ou valor público de chave Gemini entrou no frontend.
- Validar os fluxos existentes e produzir o resumo objetivo solicitado.

## Detalhes técnicos
- Modelo e versão da API serão fixados conforme o catálogo oficial atual do Google confirmado durante a auditoria.
- A integração usará endpoint/SDK oficial compatível com o ambiente serverless do projeto.
- Não haverá fallback para o Lovable AI Gateway nem logs de chaves, payloads confidenciais ou documentos.
