# Auditoria e migração — Google Gemini direto

## Auditoria inicial
Foram encontradas cinco implementações usando `LOVABLE_API_KEY` e `https://api.lovable.ai/v1/chat/completions`: extração geral, extração de comissão, análise auxiliar, Assistente Analítico e chat. A Central de Entrada ainda forçava `simulationMode: true` para documentos que não fossem relatórios de comissão.

## Migração aplicada
Todas as cinco funções passaram a usar o cliente compartilhado exclusivo do servidor em `src/lib/gemini.server.ts`, com `GEMINI_API_KEY` e o endpoint oficial `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`. Não há fallback para o Lovable AI Gateway.

Modelo final: `gemini-3.1-flash-lite`, listado e aceito pela chave do projeto. O primeiro modelo avaliado, `gemini-2.5-flash`, foi listado pela API, mas a chamada retornou HTTP 404 `NOT_FOUND`; portanto foi substituído pela opção atual de baixo custo que respondeu HTTP 200.

Extrações de apólices, contas/despesas, documentos diversos e relatórios de comissão usam `responseMimeType: application/json` e `responseSchema`. PDFs originais são codificados no navegador e enviados ao backend com MIME `application/pdf`; a chave permanece somente no backend. O arquivo original continua sendo salvo antes da análise, e os dados ficam em revisão antes da confirmação.

## Tratamento de erros
Implementado tratamento para chave ausente/inválida, 401, 403, 404/modelo indisponível, 413/arquivo grande, 429/quota, 503, 504, timeout de 120 segundos, MIME/base64 inválidos, PDF acima de 50 MB, imagem acima de 20 MB, bloqueio de conteúdo e resposta inválida.

## Validação
- Teste direto de texto: HTTP 200, resposta `GEMINI_DIRETO_OK`, 22 tokens.
- Teste direto de JSON estruturado: HTTP 200, resposta validada `{"category":"internet","amount":150}`.
- Testes de resiliência: 6/6 passaram.
- Busca global: nenhuma referência de IA restante a `LOVABLE_API_KEY`, `api.lovable.ai`, `ai.gateway.lovable.dev`, `simulationMode` ou variáveis públicas Gemini em `src`.
- A secret `LOVABLE_API_KEY` permaneceu cadastrada e não foi removida.
- Nenhuma mudança de RLS, RBAC, Storage, service role ou banco foi realizada.

## Arquivos alterados
- `src/lib/gemini.server.ts`
- `src/lib/ai-extraction.functions.ts`
- `src/lib/commission-extraction.functions.ts`
- `src/lib/ai.functions.ts`
- `src/lib/business-ai.functions.ts`
- `src/lib/chat.functions.ts`
- `src/utils/pdf-converter.ts`
- `src/routes/_authenticated/central-entrada.tsx`
- `src/routes/_authenticated/index.tsx`
- `src/components/CoutSegIA.tsx`
- `src/lib/business-ai.resilience.test.ts`
