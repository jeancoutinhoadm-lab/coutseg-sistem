import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const processDocumentWithIA = createServerFn({ method: "POST" })
  .inputValidator((data: { image: string; mimeType: string; documentType: 'policy' | 'bill' | 'commission_report' | 'other' }) => 
    z.object({
      image: z.string(),
      mimeType: z.string(),
      documentType: z.enum(['policy', 'bill', 'commission_report', 'other'])
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("Configuração de IA ausente.");

    const prompts = {
      policy: `Extraia dados da apólice de seguro em JSON: policy_number, client_name, client_cpf_cnpj, insurer_name, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), premium (number), installments (number), payment_method, coverage_details (text). Responda apenas o JSON.`,
      bill: `Extraia dados do boleto/conta em JSON: provider_name, amount (number), due_date (YYYY-MM-DD), bar_code, category_suggestion. Responda apenas o JSON.`,
      commission_report: `Extraia dados do relatório de comissão em JSON: insurer_name, statement_date, total_amount, items (array de { policy_number, client_name, amount, date }). Responda apenas o JSON.`,
      other: `Descreva o conteúdo deste documento de forma estruturada em JSON.`
    };

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
                { type: 'text', text: prompts[data.documentType] },
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

      const result = await response.json();
      const content = result.choices[0].message.content;
      return JSON.parse(content.replace(/```json|```/g, ''));
    } catch (error) {
      console.error("Erro na IA:", error);
      throw new Error("Falha ao processar com IA.");
    }
  });
