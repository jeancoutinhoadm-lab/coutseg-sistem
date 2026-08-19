import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
    const apiKey = process.env['LOVABLE_API_KEY'];

    if (!apiKey) {
      throw new Error("Configuração de IA (LOVABLE_API_KEY) ausente.");
    }

    const prompt = `Você é um sistema de extração de dados financeiros de seguros.
Leia exclusivamente o documento fornecido (Relatório de Comissões).
Extraia somente informações presentes no documento.
Nunca invente informações. Se não encontrar, retorne null.
Retorne um JSON estruturado seguindo este schema:

{
  "document_type": "commission_report",
  "insurer": { "name": "Nome da Seguradora" },
  "competence": "Mês/Ano de referência",
  "payment_date": "Data de pagamento (YYYY-MM-DD)",
  "report_reference": "Número do extrato/referência",
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
      "broker_name": "Nome do corretor"
    }
  ]
}

Regras:
1. Valores monetários devem ser números (1234.56).
2. Datas devem ser YYYY-MM-DD.
3. Extraia todas as linhas de comissão.
4. Responda apenas o JSON puro, sem markdown.`;

    const startTime = Date.now();

    try {
      const response = await fetch('https://api.lovable.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:${data.mimeType};base64,${data.image}` },
                },
              ],
            },
          ],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro no provedor de IA: ${response.status}`);
      }

      const result = await response.json();
      const endTime = Date.now();
      
      const content = result.choices[0].message.content;
      let extracted: CommissionReportData;

      try {
        const cleanedContent = content.replace(/```json|```/g, '').trim();
        extracted = JSON.parse(cleanedContent);
      } catch (e) {
        throw new Error("Falha ao parsear JSON da IA.");
      }

      // Normalização Básica e Cálculo de Diferença
      extracted.items = extracted.items.map(item => ({
        ...item,
        status: 'pending_review',
        difference: (item.paid_commission || 0) - (item.expected_commission || 0)
      })) as any;

      // Adicionar Metadados
      extracted.metadata = {
        input_tokens: result.usage?.prompt_tokens,
        output_tokens: result.usage?.completion_tokens,
        execution_duration_ms: endTime - startTime,
        ai_model: 'gpt-4o'
      };

      return extracted;
    } catch (error: any) {
      console.error("Erro na extração IA:", error);
      throw new Error(error.message || "Falha na extração com IA.");
    }
  });
