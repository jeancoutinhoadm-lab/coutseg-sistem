import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const askCoutSegIA = createServerFn({ method: "POST" })
  .inputValidator((data: { message: string }) => 
    z.object({
      message: z.string()
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("Configuração de IA ausente.");

    // Em uma implementação real, aqui faríamos buscas no banco de dados para alimentar o contexto.
    // Por enquanto, forneceremos um resumo do sistema.
    try {
      const response = await fetch('https://api.lovable.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-lite-preview-02-05',
          messages: [
            {
              role: 'system',
              content: 'Você é o assistente IA da CoutSeg Gestão. Ajude o usuário a navegar no sistema de corretora de seguros. Você tem acesso aos dados de clientes, apólices e financeiro (simulado via contexto).'
            },
            { role: 'user', content: data.message }
          ],
          temperature: 0.7,
        }),
      });

      const result = await response.json();
      return { text: result.choices[0].message.content };
    } catch (error) {
      console.error("Erro no Chat IA:", error);
      throw new Error("Falha ao consultar assistente.");
    }
  });
