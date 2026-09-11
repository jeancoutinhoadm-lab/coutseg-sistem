import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGeminiJson } from "./gemini.server";

const nullableString = { type: ["string", "null"] };
const nullableNumber = { type: ["number", "null"] };
const commissionReportSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    document_type: { type: "string", enum: ["commission_report"] },
    insurer: {
      type: "object",
      additionalProperties: false,
      properties: { name: nullableString },
      required: ["name"],
    },
    competence: nullableString,
    payment_date: nullableString,
    report_reference: nullableString,
    document_line_count: nullableNumber,
    document_total: nullableNumber,
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          policy_number: nullableString,
          client_name: nullableString,
          client_document: nullableString,
          product: nullableString,
          premium: nullableNumber,
          commission_rate: nullableNumber,
          expected_commission: nullableNumber,
          paid_commission: nullableNumber,
          due_date: nullableString,
          payment_date: nullableString,
          broker_name: nullableString,
          parcel_number: nullableString,
        },
        required: ["policy_number", "client_name", "client_document", "product", "premium", "commission_rate", "expected_commission", "paid_commission", "due_date", "payment_date", "broker_name", "parcel_number"],
      },
    },
  },
  required: ["document_type", "insurer", "competence", "payment_date", "report_reference", "document_line_count", "document_total", "items"],
} as const;

/**
 * Interface para os itens extraídos do relatório de comissão
 */
export interface CommissionReportItem {
  policy_number: string | null;
  client_name: string | null;
  client_document: string | null;
  product: string | null;
  premium: number | null;
  commission_rate: number | null;
  expected_commission: number | null;
  paid_commission: number | null;
  difference: number | null;
  broker_name: string | null;
  due_date?: string | null;
  payment_date?: string | null;
  parcel_number?: string | null;
  status: 'pending_review' | 'confirmed' | 'corrected' | 'rejected';
  matched_policy_id?: string | null;
  matched_client_id?: string | null;
}

export interface CommissionReportData {
  document_type: "commission_report";
  insurer: {
    name: string | null;
    matched_id?: string | null;
  };
  competence: string | null;
  payment_date: string | null;
  report_reference: string | null;
  document_line_count: number | null;
  document_total: number | null;
  items: CommissionReportItem[];
  metadata?: {
    input_tokens?: number;
    output_tokens?: number;
    estimated_cost?: number;
    execution_duration_ms?: number;
    ai_model?: string;
  };
}

/**
 * Server function para extração real de relatórios de comissão via IA
 */
export const extractCommissionReportWithIA = createServerFn({ method: "POST" })
  .inputValidator((data: { 
    image: string; 
    mimeType: string;
    documentId: string;
  }) => 
    z.object({
      image: z.string(),
      mimeType: z.string(),
      documentId: z.string(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const prompt = `Você é um sistema de extração de dados financeiros de seguros de ALTA PRECISÃO.
Leia exclusivamente o documento fornecido (Relatório de Comissões).
Extraia somente informações presentes no documento.
Nunca invente informações. Se não encontrar, retorne null.

EXTREMAMENTE IMPORTANTE:
1. Extraia TODAS as linhas de comissão. Não pule nenhuma.
2. Identifique a quantidade total de linhas de comissão no documento e o valor total pago informado.
3. Se o documento tiver subtotais ou cabeçalhos repetidos, ignore-os na lista de 'items', mas use-os para validar a contagem.

Retorne um JSON estruturado seguindo este schema:

{
  "document_type": "commission_report",
  "insurer": { "name": "Nome da Seguradora" },
  "competence": "Mês/Ano de referência",
  "payment_date": "Data de pagamento (YYYY-MM-DD)",
  "report_reference": "Número do extrato/referência",
  "document_line_count": 0,
  "document_total": 0.00,
  "items": [
    {
      "policy_number": "Número da apólice",
      "client_name": "Nome do cliente",
      "client_document": "CPF/CNPJ do cliente",
      "product": "Produto/Ramo",
      "premium": 0.00,
      "commission_rate": 0.00,
      "expected_commission": 0.00,
      "paid_commission": 0.00,
      "due_date": "YYYY-MM-DD",
      "payment_date": "YYYY-MM-DD",
      "broker_name": "Nome do corretor",
      "parcel_number": "Número da parcela (ex: 1/12)"
    }
  ]
}

Regras:
1. 'expected_commission' é o valor que a seguradora diz que deveria pagar.
2. 'paid_commission' é o valor que a seguradora efetivamente pagou nesta linha.
3. Se houver estorno, o 'paid_commission' deve ser negativo.
4. 'parcel_number' ajuda a diferenciar pagamentos da mesma apólice.
5. Valores monetários devem ser números (1234.56). Use null se não encontrar.
6. Datas devem ser YYYY-MM-DD.
7. Responda apenas o JSON puro, sem markdown.`;


    const startTime = Date.now();

    try {
      const result = await callGeminiJson<CommissionReportData>({
        prompt,
        file: { base64: data.image, mimeType: data.mimeType },
        responseSchema: commissionReportSchema,
      });
      const endTime = Date.now();
      const extracted = result.data;

      if (!Array.isArray(extracted.items)) {
        throw new Error("A API Gemini retornou um relatório sem itens válidos.");
      }

      // Normalização Básica e Cálculo de Diferença
      extracted.items = extracted.items.map(item => ({
        ...item,
        status: 'pending_review',
        difference: (item.paid_commission || 0) - (item.expected_commission || 0)
      })) as any;

      // Adicionar Metadados
      extracted.metadata = {
        input_tokens: result.usage?.promptTokenCount,
        output_tokens: result.usage?.candidatesTokenCount,
        execution_duration_ms: endTime - startTime,
        ai_model: result.model
      };

      return extracted;
    } catch (error: any) {
      console.error("Erro na extração IA", {
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
      throw new Error(error.message || "Falha na extração com IA.");
    }
  });