import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGemini } from "./gemini.server";

export const analyzeDocument = createServerFn({ method: "POST" })
  .inputValidator((data: { image: string; mimeType: string; prompt: string }) => 
    z.object({
      image: z.string(),
      mimeType: z.string(),
      prompt: z.string()
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const result = await callGemini({
      prompt: data.prompt,
      file: { base64: data.image, mimeType: data.mimeType },
    });
    return { text: result.text };
  });
