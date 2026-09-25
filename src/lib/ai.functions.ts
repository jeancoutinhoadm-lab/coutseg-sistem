import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGemini } from "./gemini.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeAiQuota, requireAnyRole } from "./server-security";

export const analyzeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { image: string; mimeType: string; prompt: string }) => 
    z.object({
      image: z.string().max(14_000_000),
      mimeType: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
      prompt: z.string().trim().min(1).max(1_000)
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "gerente", "administrativo", "corretor"]);
    await consumeAiQuota(context.supabase);
    const result = await callGemini({
      prompt: data.prompt,
      file: { base64: data.image, mimeType: data.mimeType },
    });
    return { text: result.text };
  });
