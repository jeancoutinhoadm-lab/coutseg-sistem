import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server function to process documents using IA (GPT-4o).
 * This is a thin wrapper around the AI Gateway.
 */
export const processDocumentWithIA = createServerFn({ method: "POST" })
  .inputValidator((data: { image: string; mimeType: string; documentType: 'policy' | 'bill' | 'commission_report' | 'other' }) => 
    z.object({
      image: z.string(),
      mimeType: z.string(),
      documentType: z.enum(['policy', 'bill', 'commission_report', 'other'])
    }).parse(data)
  )
  .handler(async ({ data }) => {
    // The LOVABLE_API_KEY is automatically available in the environment when using the AI Gateway.
    const apiKey = process.env['LOVABLE_API_KEY'];

    if (!apiKey) {
      console.error("LOVABLE_API_KEY is not defined in the server environment.");
      throw new Error("Configuração de IA (API Key) ausente no servidor.");
    }

    const prompts = {
      policy: `Extraia dados da apólice de seguro em JSON: policy_number, client_name, client_cpf_cnpj, insurer_name, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), premium (number), installments (number), payment_method, coverage_details (text). Responda apenas o JSON.`,
      bill: `Extraia dados do boleto/conta em JSON: provider_name, amount (number), due_date (YYYY-MM-DD), bar_code, category_suggestion. Responda apenas o JSON.`,
      commission_report: `Extraia dados do relatório de comissão em JSON: insurer_name, statement_date, total_amount, items (array de { policy_number, client_name, amount, date }). Responda apenas o JSON.`,
      other: `Descreva o conteúdo deste documento de forma estruturada em JSON.`
    };

    try {
      console.log(`Iniciando processamento de IA para o tipo: ${data.documentType}`);
      
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro no AI Gateway (${response.status}):`, errorText);
        
        if (response.status === 401 || response.status === 403) {
          throw new Error("Erro de autenticação com o provedor de IA. Verifique os créditos.");
        }
        
        if (response.status === 504 || response.status === 503) {
          throw new Error("O servidor de IA está demorando muito para responder (Timeout). Tente um arquivo menor.");
        }

        throw new Error(`Falha na comunicação com IA: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.choices?.[0]?.message?.content) {
        console.error("Estrutura de resposta da IA inesperada:", result);
        throw new Error("A IA não retornou um conteúdo válido.");
      }

      const content = result.choices[0].message.content;
      console.log("Resposta bruta da IA recebida.");

      try {
        // Remove markdown blocks if present
        const cleanedContent = content.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanedContent);
      } catch (e) {
        console.error("Falha ao parsear JSON retornado pela IA. Conteúdo:", content);
        throw new Error("A IA retornou um formato de dados que não pôde ser lido automaticamente.");
      }
    } catch (error: any) {
      console.error("Exceção capturada em processDocumentWithIA:", error);
      
      if (error.message.includes('fetch failed')) {
        throw new Error("Perda de conexão com o servidor de IA. Tente novamente em instantes.");
      }
      
      throw new Error(error.message || "Falha crítica no processamento com IA.");
    }
  });
