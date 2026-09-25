import { createHash, randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./server-security";

const codeHash = (value: string) => createHash("sha256").update(value).digest("hex");

export const generateAssistantLinkCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ channel: z.literal("whatsapp") }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "gerente", "financeiro", "administrativo", "corretor"]);
    const code = randomBytes(18).toString("base64url").toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const table = context.supabase.from as any;
    const { error } = await table("assistant_link_codes").insert({
      user_id: context.userId, code_hash: codeHash(code), expires_at: expiresAt,
    });
    if (error) throw new Error("Não foi possível gerar o código de vinculação.");
    return { code, expiresAt, channel: data.channel };
  });

export const listAssistantChannelLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const table = context.supabase.from as any;
    const { data, error } = await table("user_channel_links")
      .select("id, channel, external_identifier, verified_at, active, created_at, revoked_at")
      .eq("user_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error("Não foi possível consultar vínculos de canais.");
    return data ?? [];
  });

export const revokeAssistantChannelLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const table = context.supabase.from as any;
    const { error } = await table("user_channel_links")
      .update({ active: false, revoked_at: new Date().toISOString() })
      .eq("id", data.id).eq("user_id", context.userId).eq("active", true);
    if (error) throw new Error("Não foi possível revogar o vínculo.");
    return { success: true };
  });
