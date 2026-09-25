import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGeminiJson } from "./gemini.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota, requireAnyRole, requireDocumentAccess } from "./server-security";

const nullableString = { type: "string", nullable: true };
const nullableNumber = { type: "number", nullable: true };

const extractionSchemas = {
  policy: {
    type: "object",
    properties: {
      policy_number: nullableString,

      client_name: nullableString,
      client_cpf_cnpj: nullableString,
      client_email: nullableString,
      client_phone: nullableString,
      client_address: nullableString,
      client_city: nullableString,
      client_state: nullableString,
      client_zip_code: nullableString,

      insurer_name: nullableString,
      insurer_cnpj: nullableString,

      product_name: nullableString,
      policy_type: nullableString,

      issuance_date: nullableString,
      start_date: nullableString,
      end_date: nullableString,
      renewal_date: nullableString,

      premium: nullableNumber,
      coverage_amount: nullableNumber,
      deductible: nullableNumber,

      installments: nullableNumber,
      payment_method: nullableString,
      coverage_details: nullableString,
    },
    required: [
      "policy_number",
      "client_name",
      "client_cpf_cnpj",
      "client_email",
      "client_phone",
      "client_address",
      "client_city",
      "client_state",
      "client_zip_code",
      "insurer_name",
      "insurer_cnpj",
      "product_name",
      "policy_type",
      "issuance_date",
      "start_date",
      "end_date",
      "renewal_date",
      "premium",
      "coverage_amount",
      "deductible",
      "installments",
      "payment_method",
      "coverage_details",
    ],
  },

  bill: {
    type: "object",
    properties: {
      provider_name: nullableString,
      amount: nullableNumber,
      due_date: nullableString,
      bar_code: nullableString,
      category_suggestion: nullableString,
    },
    required: [
      "provider_name",
      "amount",
      "due_date",
      "bar_code",
      "category_suggestion",
    ],
  },

  commission_report: {
    type: "object",
    properties: {
      insurer_name: nullableString,
      statement_date: nullableString,
      total_amount: nullableNumber,
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            policy_number: nullableString,
            client_name: nullableString,
            amount: nullableNumber,
            date: nullableString,
          },
          required: [
            "policy_number",
            "client_name",
            "amount",
            "date",
          ],
        },
      },
    },
    required: [
      "insurer_name",
      "statement_date",
      "total_amount",
      "items",
    ],
  },

  other: {
    type: "object",
    properties: {
      description: { type: "string" },
    },
    required: ["description"],
  },
} as const;

export const processDocumentWithIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      image: string;
      mimeType: string;
      documentId?: string;
      documentType: "policy" | "bill" | "commission_report" | "other";
    }) =>
      z
        .object({
          image: z.string().max(14_000_000),
          mimeType: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
          documentId: z.string().uuid().optional(),
          documentType: z.enum([
            "policy",
            "bill",
            "commission_report",
            "other",
          ]),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "gerente", "administrativo", "corretor"]);
    if (data.documentId) await requireDocumentAccess(context.supabase, data.documentId);
    await consumeAiQuota(context.supabase);
    const prompts = {
      policy: `
Você é responsável pela leitura de apólices de seguros brasileiras.

Analise TODO o documento enviado, incluindo todas as páginas, cabeçalhos,
rodapés, quadros e seções.

Extraia os dados abaixo com máxima precisão.

SEGURADO:
- client_name: nome ou razão social do segurado.
- client_cpf_cnpj: CPF ou CNPJ do segurado.
- client_email: e-mail, se constar.
- client_phone: telefone, se constar.
- client_address: endereço, se constar.
- client_city: cidade, se constar.
- client_state: UF, se constar.
- client_zip_code: CEP, se constar.

SEGURADORA:
- insurer_name: nome da seguradora emissora da apólice.
- insurer_cnpj: CNPJ da seguradora, se estiver disponível.

APÓLICE:
- policy_number: número da apólice.
- issuance_date: data de emissão da apólice.
- start_date: início da vigência.
- end_date: fim da vigência.
- renewal_date: data prevista para renovação. Se o documento não trouxer
  explicitamente uma data de renovação, use end_date.
- premium: prêmio total da apólice.
- coverage_amount: limite máximo de cobertura ou importância segurada geral,
  somente quando houver um valor geral claramente identificável.
- deductible: franquia principal, quando aplicável.
- installments: quantidade de parcelas.
- payment_method: forma de pagamento.
- coverage_details: resumo objetivo das principais coberturas.

PRODUTO:
- product_name: nome comercial ou ramo do seguro descrito no documento.
  Exemplos: Seguro Auto, Automóvel, Residencial, Empresarial, Vida,
  Responsabilidade Civil, Condomínio, Equipamentos, Transporte etc.
- policy_type: classifique OBRIGATORIAMENTE em apenas um destes valores:
  "auto", "home", "life", "health", "business" ou "other".

REGRAS IMPORTANTES:
1. Não invente dados.
2. Quando uma informação não existir, retorne null.
3. Datas devem estar exclusivamente em YYYY-MM-DD.
4. Valores monetários devem ser números, sem "R$", pontos de mil ou texto.
5. CPF/CNPJ deve ser retornado somente com dígitos.
6. insurer_cnpj deve ser retornado somente com dígitos.
7. CEP deve ser retornado somente com dígitos.
8. Não confunda CPF/CNPJ do corretor com CPF/CNPJ do segurado.
9. Não confunda a corretora com a seguradora.
10. Não extraia comissão nem corretor responsável, pois esses dados serão
    informados manualmente pelo funcionário.
11. Se houver mais de um prêmio, premium deve representar o prêmio total.
12. Se houver início e fim de vigência com horário, retorne apenas a data.
13. Retorne somente o JSON compatível com o schema fornecido.
`,

      bill: `
Extraia os dados do boleto ou conta em JSON:
provider_name, amount, due_date no formato YYYY-MM-DD,
bar_code e category_suggestion.
Não invente informações.
`,

      commission_report: `
Extraia os dados do relatório de comissão em JSON:
insurer_name, statement_date, total_amount e items.

Cada item deve conter:
policy_number, client_name, amount e date.

Datas devem estar no formato YYYY-MM-DD.
Valores monetários devem ser números.
Não invente informações.
`,

      other: `
Descreva o conteúdo deste documento de forma estruturada em JSON.
`,
    };

    const result = await callGeminiJson<any>({
      prompt: prompts[data.documentType],
      file: {
        base64: data.image,
        mimeType: data.mimeType,
      },
      responseSchema: extractionSchemas[data.documentType],
    });

    return result.data;
  });
