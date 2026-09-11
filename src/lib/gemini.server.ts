const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 120_000;

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: GeminiUsage;
  error?: { code?: number; message?: string; status?: string };
};

export type GeminiResult = {
  text: string;
  model: string;
  usage?: GeminiUsage;
};

export type GeminiRequest = {
  prompt: string;
  systemInstruction?: string;
  file?: { base64: string; mimeType: string };
  responseSchema?: Record<string, unknown>;
  temperature?: number;
};

export function getGeminiModel() {
  return GEMINI_MODEL;
}

function decodedBase64Size(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function validateFile(file: NonNullable<GeminiRequest["file"]>) {
  const allowedMimeTypes = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);

  if (!allowedMimeTypes.has(file.mimeType)) {
    throw new Error("Arquivo inválido. Envie um PDF, PNG, JPEG ou WebP.");
  }

  if (!file.base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.base64)) {
    throw new Error("O arquivo enviado está inválido ou corrompido.");
  }

  const size = decodedBase64Size(file.base64);
  const limit = file.mimeType === "application/pdf" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (size === 0) throw new Error("O arquivo enviado está vazio.");
  if (size > limit) {
    throw new Error(
      file.mimeType === "application/pdf"
        ? "O PDF excede o limite de 50 MB para análise."
        : "A imagem excede o limite de 20 MB para análise.",
    );
  }
}

function safeGeminiError(status: number, providerStatus?: string) {
  if (status === 400) return new Error("O arquivo ou pedido enviado para a IA é inválido.");
  if (status === 401) return new Error("A chave da API Gemini é inválida.");
  if (status === 403) return new Error("A API Gemini recusou o acesso. Verifique as permissões da chave.");
  if (status === 404 || providerStatus === "NOT_FOUND") {
    return new Error("O modelo Gemini configurado não está disponível para esta chave.");
  }
  if (status === 413) return new Error("O arquivo é grande demais para ser processado.");
  if (status === 429 || providerStatus === "RESOURCE_EXHAUSTED") {
    return new Error("A cota da API Gemini foi excedida. Aguarde ou verifique seu plano no Google.");
  }
  if (status === 503) return new Error("O modelo Gemini está temporariamente indisponível.");
  if (status === 504) return new Error("A API Gemini excedeu o tempo de processamento.");
  return new Error(`A API Gemini retornou um erro (${status}).`);
}

export async function callGemini(request: GeminiRequest): Promise<GeminiResult> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("A chave GEMINI_API_KEY não está configurada no servidor.");

  if (request.file) validateFile(request.file);

  const parts: GeminiPart[] = [{ text: request.prompt }];
  if (request.file) {
    parts.push({
      inlineData: {
        mimeType: request.file.mimeType,
        data: request.file.base64,
      },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          ...(request.systemInstruction
            ? { systemInstruction: { parts: [{ text: request.systemInstruction }] } }
            : {}),
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: request.temperature ?? 0,
            ...(request.responseSchema
              ? {
                  responseMimeType: "application/json",
                  responseSchema: request.responseSchema,
                }
              : {}),
          },
        }),
        signal: controller.signal,
      },
    );

    const raw = await response.text();
    let payload: GeminiResponse;
    try {
      payload = raw ? (JSON.parse(raw) as GeminiResponse) : {};
    } catch {
      throw new Error("A API Gemini retornou uma resposta inválida.");
    }

    if (!response.ok) {
      console.error("Gemini API request failed", {
        status: response.status,
        providerStatus: payload.error?.status,
      });
      throw safeGeminiError(response.status, payload.error?.status);
    }

    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      const blockReason = payload.promptFeedback?.blockReason;
      console.error("Gemini API returned no text", {
        finishReason: payload.candidates?.[0]?.finishReason,
        blocked: Boolean(blockReason),
      });
      throw new Error(
        blockReason
          ? "A API Gemini bloqueou o conteúdo enviado."
          : "A API Gemini não retornou uma resposta válida.",
      );
    }

    return { text, model: GEMINI_MODEL, usage: payload.usageMetadata };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A API Gemini excedeu o tempo limite de processamento.");
    }
    if (error instanceof Error) throw error;
    throw new Error("Falha de conexão com a API Gemini.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function callGeminiJson<T>(request: GeminiRequest): Promise<GeminiResult & { data: T }> {
  const result = await callGemini(request);
  try {
    return { ...result, data: JSON.parse(result.text) as T };
  } catch {
    throw new Error("A API Gemini retornou dados estruturados inválidos.");
  }
}