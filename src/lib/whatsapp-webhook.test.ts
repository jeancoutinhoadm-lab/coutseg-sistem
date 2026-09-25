import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { extractIncomingMessages, verifyMetaSignature, verifyWebhookHandshake, whatsappCallbackPath } from "./whatsapp-webhook.server";

describe("WhatsApp webhook perimeter", () => {
  const token = "verification-token-for-test";
  it("returns only the challenge for a correct verification token", () => {
    const url = new URL(`https://example.test${whatsappCallbackPath}?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=challenge-value`);
    expect(verifyWebhookHandshake(url, token)).toBe("challenge-value");
    expect(verifyWebhookHandshake(url, "wrong-token")).toBeNull();
  });

  it("accepts only a valid Meta HMAC signature", async () => {
    const body = '{"entry":[]}'; const secret = "app-secret-for-test";
    const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    await expect(verifyMetaSignature(body, signature, secret)).resolves.toBe(true);
    await expect(verifyMetaSignature(body, "sha256=" + "0".repeat(64), secret)).resolves.toBe(false);
    await expect(verifyMetaSignature(body, null, secret)).resolves.toBe(false);
  });

  it("extracts only a validated message identifier and sender", () => {
    const messages = extractIncomingMessages({ entry: [{ changes: [{ value: { messages: [{ id: "wamid.1", from: "+55 (11) 99999-0000", type: "text", text: { body: "codigo" } }] } }] }] });
    expect(messages).toEqual([{ eventId: "wamid.1", sender: "5511999990000", text: "codigo" }]);
    expect(extractIncomingMessages({ entry: "malformed" })).toEqual([]);
  });
});
