import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const analyzeDocument = createServerFn({ method: "POST" })
  .inputValidator((data: { image: string; mimeType: string; prompt: string }) => 
    z.object({
      image: z.string(),
      mimeType: z.string(),
      prompt: z.string()
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    
    if (!apiKey) {
      console.error("LOVABLE_API_KEY is not set");
      throw new Error("Configuração de IA ausente no servidor.");
    }

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
                { type: 'text', text: data.prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${data.mimeType};base64,${data.image}`,
                  },
                },
              ],
            },
          ],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Gateway Error:", errorText);
        throw new Error(`Erro na API de IA: ${response.status}`);
      }

      const result = await response.json();
      return { text: result.choices[0].message.content };
    } catch (error: any) {
      console.error("Error in analyzeDocument:", error);
      throw new Error(error.message || "Falha ao processar documento com IA.");
    }
  });
