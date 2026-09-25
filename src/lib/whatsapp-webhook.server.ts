import { createHash, timingSafeEqual } from "node:crypto";

const getEnv = (name: string) => (globalThis as typeof globalThis & { process?: NodeJS.Process }).process?.env?.[name];
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const whatsappCallbackPath = "/api/webhooks/whatsapp";

export function verifyWebhookHandshake(url: URL, verifyToken?: string) {
  const received = url.searchParams.get("hub.verify_token"), challenge = url.searchParams.get("hub.challenge");
  if (url.searchParams.get("hub.mode") !== "subscribe" || !received || !challenge || !verifyToken) return null;
  const a = Buffer.from(received), b = Buffer.from(verifyToken);
  return a.length === b.length && timingSafeEqual(a, b) ? challenge : null;
}

export async function verifyMetaSignature(raw: string, signature: string | null, secret?: string) {
  if (!signature?.startsWith("sha256=") || !secret) return false;
  const expected = signature.slice(7); if (!/^[a-f0-9]{64}$/i.test(expected)) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const actual = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw))).toString("hex");
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected.toLowerCase()));
}

export type IncomingWhatsAppMessage = { eventId: string; sender: string; text?: string };
export function extractIncomingMessages(payload: unknown): IncomingWhatsAppMessage[] {
  const entries = (payload as any)?.entry; if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry: any) => Array.isArray(entry?.changes) ? entry.changes.flatMap((change: any) => Array.isArray(change?.value?.messages) ? change.value.messages.flatMap((m: any) => typeof m?.id === "string" && typeof m?.from === "string" ? [{ eventId: m.id, sender: m.from.replace(/\D/g, ""), text: typeof m?.text?.body === "string" ? m.text.body.slice(0, 500) : undefined }] : []) : []) : []);
}

async function persistEvent(admin: any, eventHash: string) {
  const { error } = await (admin.from as any)("whatsapp_webhook_events").insert({ event_hash: eventHash, outcome: "received", processed_at: new Date().toISOString() });
  return !error;
}
async function activeLinkedUser(admin: any, sender: string) {
  const { data } = await (admin.from as any)("user_channel_links").select("user_id").eq("channel", "whatsapp").eq("external_identifier", sender).eq("active", true).is("revoked_at", null).not("verified_at", "is", null).maybeSingle();
  if (!data?.user_id) return null;
  const { data: role } = await (admin.from as any)("user_roles").select("user_id").eq("user_id", data.user_id).maybeSingle();
  if (!role?.user_id) return null;
  const { data: auth } = await admin.auth.admin.getUserById(data.user_id);
  return auth?.user && !auth.user.banned_until ? data.user_id as string : null;
}
async function maybeConfirmLink(admin: any, sender: string, text?: string) {
  const code = text?.trim(); if (!code || !/^[A-Z0-9_-]{16,64}$/.test(code)) return null;
  const codeHash = sha256(code);
  const { data: candidate } = await (admin.from as any)("assistant_link_codes")
    .select("user_id").eq("code_hash", codeHash).is("used_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!candidate?.user_id) return null;

  const { data: auth } = await admin.auth.admin.getUserById(candidate.user_id);
  if (!auth?.user || auth.user.banned_until) return null;

  // A valid code may establish a new link, but must never move a live number
  // from another user. Revocation must be performed from the authenticated UI.
  const { data: existing } = await (admin.from as any)("user_channel_links")
    .select("user_id").eq("channel", "whatsapp").eq("external_identifier", sender).eq("active", true).is("revoked_at", null).maybeSingle();
  if (existing?.user_id && existing.user_id !== candidate.user_id) return null;

  const { data } = await (admin.rpc as any)("redeem_whatsapp_link_code", { _code_hash: codeHash, _external_identifier: sender });
  return data === candidate.user_id ? data as string : null;
}

export async function handleWhatsAppWebhook(request: Request): Promise<Response> {
  if (request.method === "GET") {
    const url = new URL(request.url), verifyToken = getEnv("META_WHATSAPP_VERIFY_TOKEN");
    const challenge = verifyWebhookHandshake(url, verifyToken); return challenge === null ? new Response("Forbidden", { status: 403 }) : new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
  }
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const raw = await request.text();
  if (!(await verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"), getEnv("META_APP_SECRET")))) return new Response("Forbidden", { status: 403 });
  let payload: unknown; try { payload = JSON.parse(raw); } catch { return new Response("OK", { status: 200 }); }
  try {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    for (const message of extractIncomingMessages(payload)) {
      const eventHash = sha256(message.eventId); if (!(await persistEvent(admin, eventHash))) continue;
      const confirmedUser = await maybeConfirmLink(admin, message.sender, message.text);
      const linkedUser = confirmedUser ?? await activeLinkedUser(admin, message.sender);
      const initialOutcome = confirmedUser ? "link_confirmed" : linkedUser ? "linked_pending_delegation" : "unlinked_sender";
      await (admin.from as any)("whatsapp_webhook_events").update({ outcome: initialOutcome, user_id: linkedUser, processed_at: new Date().toISOString() }).eq("event_hash", eventHash);
      if (!linkedUser || confirmedUser || !message.text) continue;

      // This is the sole operational delegation call: fixed allowlisted RPCs
      // receive the user resolved from the verified link, never from WhatsApp.
      const started = performance.now();
      try {
        const { data: allowed } = await (admin.rpc as any)("consume_assistant_delegated_quota", { _delegated_user_id: linkedUser, _channel: "whatsapp" });
        if (allowed !== true) throw new Error("quota");
        const { runTrustedExternalAssistant } = await import("./assistant-gateway.functions");
        const result = await runTrustedExternalAssistant(admin, linkedUser, message.text);
        await (admin.from as any)("assistant_interaction_audit").insert({ user_id: linkedUser, channel: "whatsapp", intent: result.tool, tool_name: result.tool, outcome: "success", duration_ms: Math.round(performance.now() - started) });
        await (admin.from as any)("whatsapp_webhook_events").update({ outcome: "delegated_success", processed_at: new Date().toISOString() }).eq("event_hash", eventHash);
      } catch {
        await (admin.from as any)("assistant_interaction_audit").insert({ user_id: linkedUser, channel: "whatsapp", intent: null, tool_name: null, outcome: "denied", duration_ms: Math.round(performance.now() - started) });
        await (admin.from as any)("whatsapp_webhook_events").update({ outcome: "delegated_denied", processed_at: new Date().toISOString() }).eq("event_hash", eventHash);
      }
    }
  } catch { /* never log payloads, sender identifiers, tokens, or secrets */ }
  return new Response("OK", { status: 200 });
}
