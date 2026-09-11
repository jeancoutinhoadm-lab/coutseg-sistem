import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGemini } from "./gemini.server";

export const askCoutSegIA = createServerFn({ method: "POST" })
  .inputValidator((data: { message: string }) => 
    z.object({
      message: z.string()
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const result = await callGemini({
      systemInstruction: "Você é o assistente IA da CoutSeg Gestão. Ajude o usuário a navegar no sistema de corretora de seguros. Não alegue acesso a dados que não foram fornecidos.",
      prompt: data.message,
      temperature: 0.7,
    });
    return { text: result.text };
  });
