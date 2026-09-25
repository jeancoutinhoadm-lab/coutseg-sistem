import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGemini } from "./gemini.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota, requireAnyRole } from "./server-security";

export const askCoutSegIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { message: string }) => 
    z.object({
      message: z.string().trim().min(1).max(1_000)
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "gerente", "financeiro", "administrativo", "corretor"]);
    await consumeAiQuota(context.supabase);
    const result = await callGemini({
      systemInstruction: "Você é o assistente IA da CoutSeg Gestão. Ajude o usuário a navegar no sistema de corretora de seguros. Não alegue acesso a dados que não foram fornecidos.",
      prompt: data.message,
      temperature: 0.7,
    });
    return { text: result.text };
  });
