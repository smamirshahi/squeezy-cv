export type AiProvider = "claude" | "ollama";

export interface OllamaConfig {
  /** Where Ollama runs. Must be this machine, so the CV never leaves it. */
  url: string;
  model: string;

  /** Context size in tokens. Ollama's own default is too small for a CV plus the prompt. */
  numCtx: number;
}

export interface AiConfig {
  provider: AiProvider;

  /** Claude: secret. Only ever read on the server; never sent to the browser or logged. */
  apiKey: string | undefined;

  /** Claude: model id */
  model: string;
  timeoutMs: number;
  ollama: OllamaConfig;
}

const DEFAULT_MODEL = "claude-opus-5-5";
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.1";
const DEFAULT_NUM_CTX = 16_384;
const LOCAL_NAMES = ["127.0.0.1", "localhost", "[::1]"];

function positiveInteger(
  value: string | undefined,
  fallback: number,
  name: string
): number {
  const number = value ? Number(value) : fallback;
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${name} must be a positive whole number.`);
  }
  return number;
}

/**
 * Reads AI_PROVIDER ("claude", the default, or "ollama"), ANTHROPIC_API_KEY, ANTHROPIC_MODEL,
 * AI_TIMEOUT_MS, OLLAMA_URL, OLLAMA_MODEL and OLLAMA_NUM_CTX (see `.env.example`)
 */
export function readAiConfig(
  env: Record<string, string | undefined>
): AiConfig {
  const provider = env.AI_PROVIDER?.trim().toLowerCase() || "claude";
  if (provider !== "claude" && provider !== "ollama") {
    throw new Error('AI_PROVIDER must be "claude" or "ollama".');
  }

  const ollamaUrl = env.OLLAMA_URL?.trim() || DEFAULT_OLLAMA_URL;
  let parsed: URL;
  try {
    parsed = new URL(ollamaUrl);
  } catch {
    throw new Error(
      "OLLAMA_URL must be a full address, e.g. http://127.0.0.1:11434"
    );
  }
  // The point of Ollama here is that the CV stays on this machine
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !LOCAL_NAMES.includes(parsed.hostname.toLowerCase())
  ) {
    throw new Error(
      "OLLAMA_URL must point to this machine (localhost or 127.0.0.1), so your CV never leaves it."
    );
  }

  return {
    provider,
    apiKey: env.ANTHROPIC_API_KEY?.trim() || undefined,
    model: env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
    timeoutMs: positiveInteger(
      env.AI_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
      "AI_TIMEOUT_MS"
    ),
    ollama: {
      url: ollamaUrl.replace(/\/$/, ""),
      model: env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL,
      numCtx: positiveInteger(
        env.OLLAMA_NUM_CTX,
        DEFAULT_NUM_CTX,
        "OLLAMA_NUM_CTX"
      ),
    },
  };
}

/** Removes the key from any text before it is shown or logged */
export function redact(text: string, apiKey: string | undefined): string {
  return apiKey ? text.split(apiKey).join("[redacted]") : text;
}
