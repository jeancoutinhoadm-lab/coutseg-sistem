import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGeminiJson } from "./gemini.server";

const nullableString = { type: "string", nullable: true };
const nullableNumber = { type: "number", nullable: true };

const extractionSchemas = {
  policy: {
    type: "object",
    additionalProperties: false,
    properties: {
      policy_number: nullableString,
      client_name: nullableString,
      client_cpf_cnpj: nullableString,
      insurer_name: nullableString,
      start_date: nullableString,
      end_date: nullableString,
      premium: nullableNumber,
      installments: nullableNumber,
      payment_method: nullableString,
      coverage_details: nullableString,
      type: nullableString,
    },
    required: ["policy_number", "client_name", "client_cpf_cnpj", "insurer_name", "start_date", "end_date", "premium", "installments", "payment_method", "coverage_details", "type"],
  },
  bill: {
    type: "object",
    additionalProperties: false,
    properties: {
      provider_name: nullableString,
      amount: nullableNumber,
      due_date: nullableString,
      bar_code: nullableString,
      category_suggestion: nullableString,
    },
    required: ["provider_name", "amount", "due_date", "bar_code", "category_suggestion"],
  },
  commission_report: {
    type: "object",
    additionalProperties: false,
    properties: {
      insurer_name: nullableString,
      statement_date: nullableString,
      total_amount: nullableNumber,
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            policy_number: nullableString,
            client_name: nullableString,
            amount: nullableNumber,
            date: nullableString,
          },
          required: ["policy_number", "client_name", "amount", "date"],
        },
      },
    },
    required: ["insurer_name", "statement_date", "total_amount", "items"],
  },
  other: {
    type: "object",
    additionalProperties: false,
    properties: { description: { type: "string" } },
    required: ["description"],
  },
} as const;

/**
 * Server function to process documents using the official Gemini API.
 */
export const processDocumentWithIA = createServerFn({ method: "POST" })
  .inputValidator((data: { 
    image: string; 
    mimeType: string; 
    documentType: 'policy' | 'bill' | 'commission_report' | 'other';
  }) => 
    z.object({
      image: z.string(),
      mimeType: z.string(),
      documentType: z.enum(['policy', 'bill', 'commission_report', 'other']),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const prompts = {
      policy: `Extraia dados da apólice de seguro em JSON: policy_number, client_name, client_cpf_cnpj, insurer_name, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), premium (number), installments (number), payment_method, coverage_details (text). Responda apenas o JSON.`,
      bill: `Extraia dados do boleto/conta em JSON: provider_name, amount (number), due_date (YYYY-MM-DD), bar_code, category_suggestion. Responda apenas o JSON.`,
      commission_report: `Extraia dados do relatório de comissão em JSON: insurer_name, statement_date, total_amount, items (array de { policy_number, client_name, amount, date }). Responda apenas o JSON.`,
      other: `Descreva o conteúdo deste documento de forma estruturada em JSON.`
    };

    const result = await callGeminiJson<any>({
      prompt: prompts[data.documentType],
      file: { base64: data.image, mimeType: data.mimeType },
      responseSchema: extractionSchemas[data.documentType],
    });
    return result.data;
  });
