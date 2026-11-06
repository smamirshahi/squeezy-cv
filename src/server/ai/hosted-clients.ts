import { AiConfig, HostedConfig, redact } from "@server/ai/ai-config";
import { AiError, ChatMessage, MessageSender } from "@server/ai/ai-types";

/** Output limits: Gemini Flash allows much more, Groq's models less */
const GEMINI_MAX_OUTPUT_TOKENS = 16_000;
const GROQ_MAX_OUTPUT_TOKENS = 8_000;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_RATE_LIMITED = 429;

type FetchLike = typeof fetch;

/**
 * One JSON POST to a hosted provider. Anything that goes wrong becomes an `AiError` whose
 * message never contains the key (it is redacted from every text that comes back).
 */
async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  settings: { apiKey: string | undefined; timeoutMs: number; name: string },
  fetchImpl: FetchLike
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(settings.timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AiError("timeout", "The AI service took too long to answer.");
    }
    throw new AiError(
      "api_error",
      `${settings.name} could not be reached. Check the internet connection.`
    );
  }
  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    // handled through the status below
  }
  if (!response.ok) {
    const error = payload.error as { message?: string } | string | undefined;
    const detail = typeof error === "string" ? error : (error?.message ?? "");
    const reason =
      response.status === HTTP_UNAUTHORIZED ||
      response.status === HTTP_FORBIDDEN
        ? "the key was refused"
        : response.status === HTTP_RATE_LIMITED
          ? "the free limit is used up for now, try again later"
          : `status ${response.status}`;
    throw new AiError(
      "api_error",
      redact(
        `${settings.name} answered with an error (${reason}).${detail ? ` ${detail}` : ""}`,
        settings.apiKey
      )
    );
  }
  return payload;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

const GEMINI_REFUSALS = new Set([
  "SAFETY",
  "PROHIBITED_CONTENT",
  "BLOCKLIST",
  "SPII",
  "RECITATION",
]);

/**
 * Google Gemini over plain HTTP (the key goes in a header, not in the address). JSON mode is
 * asked for; the shared loop still checks and retries the answer.
 */
export function createGeminiSender(
  config: AiConfig,
  fetchImpl: FetchLike = fetch
): MessageSender {
  const { apiKey, model, baseUrl }: HostedConfig = config.gemini;
  return async (system: string, messages: ChatMessage[]) => {
    const payload = (await postJson(
      `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      // eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
      { "x-goog-api-key": apiKey ?? "" },
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
        },
      },
      { apiKey, timeoutMs: config.timeouts.gemini, name: "Gemini" },
      fetchImpl
    )) as GeminiResponse;

    const candidate = payload.candidates?.[0];
    const finish = candidate?.finishReason ?? "";
    const text = (candidate?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("");
    const isBlocked =
      payload.promptFeedback?.blockReason !== undefined ||
      GEMINI_REFUSALS.has(finish);
    return {
      text,
      stopReason: isBlocked
        ? "refusal"
        : finish === "MAX_TOKENS"
          ? "max_tokens"
          : finish === "STOP"
            ? "end_turn"
            : "other",
    };
  };
}

interface GroqResponse {
  choices?: {
    message?: { content?: string };
    // eslint-disable-next-line @typescript-eslint/naming-convention -- API field name
    finish_reason?: string;
  }[];
}

/** Groq (OpenAI-compatible chat completions) over plain HTTP, in JSON mode */
export function createGroqSender(
  config: AiConfig,
  fetchImpl: FetchLike = fetch
): MessageSender {
  const { apiKey, model, baseUrl }: HostedConfig = config.groq;
  return async (system: string, messages: ChatMessage[]) => {
    const payload = (await postJson(
      `${baseUrl}/v1/chat/completions`,

      { Authorization: `Bearer ${apiKey ?? ""}` },
      {
        model,
        messages: [{ role: "system", content: system }, ...messages],
        // eslint-disable-next-line @typescript-eslint/naming-convention -- API field names
        response_format: { type: "json_object" },
        // eslint-disable-next-line @typescript-eslint/naming-convention -- API field name
        max_tokens: GROQ_MAX_OUTPUT_TOKENS,
      },
      { apiKey, timeoutMs: config.timeouts.groq, name: "Groq" },
      fetchImpl
    )) as GroqResponse;

    const choice = payload.choices?.[0];
    const finish = choice?.finish_reason ?? "";
    return {
      text: choice?.message?.content ?? "",
      stopReason:
        finish === "length"
          ? "max_tokens"
          : finish === "content_filter"
            ? "refusal"
            : finish === "stop"
              ? "end_turn"
              : "other",
    };
  };
}
