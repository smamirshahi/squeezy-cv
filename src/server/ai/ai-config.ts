import { isAiProviderId } from "@shared/ai/providers";

export type AiProvider = "claude" | "gemini" | "groq" | "ollama";

interface OllamaConfig {
  /** Where Ollama runs. Must be this machine, so the CV never leaves it. */
  url: string;
  model: string;

  /** Context size in tokens. Ollama's own default is too small for a CV plus the prompt. */
  numCtx: number;
}

/** A hosted provider reached over plain HTTP with an API key (Gemini, Groq) */
export interface HostedConfig {
  /** Secret. Only ever read on the server; never sent to the browser or logged. */
  apiKey: string | undefined;
  model: string;
  baseUrl: string;
}

export interface AiConfig {
  provider: AiProvider;

  /** Claude: secret. Only ever read on the server; never sent to the browser or logged. */
  apiKey: string | undefined;

  /** Claude: model id */
  model: string;
  timeoutMs: number;
  ollama: OllamaConfig;
  gemini: HostedConfig;
  groq: HostedConfig;

  /** The timeout each provider uses: AI_TIMEOUT_MS when set, else the provider's own default */
  timeouts: Record<AiProvider, number>;
}

const DEFAULT_MODEL = "claude-opus-5-5";
const DEFAULT_TIMEOUT_MS = 120_000;
// A model on an ordinary computer's CPU can need many minutes for a CV
const DEFAULT_OLLAMA_TIMEOUT_MS = 900_000;
const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.1";
const DEFAULT_NUM_CTX = 16_384;
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const DEFAULT_GEMINI_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_GROQ_URL = "https://api.groq.com/openai";

/** The recommended model of each online provider: used when none is chosen (shown as the hint in the browser settings) */
export const DEFAULT_MODELS = {
  claude: DEFAULT_MODEL,
  gemini: DEFAULT_GEMINI_MODEL,
  groq: DEFAULT_GROQ_MODEL,
} as const;
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
/** The settings of a hosted provider. A different address is only accepted over https or on this machine (tests). */
function readHosted(
  env: Record<string, string | undefined>,
  prefix: "GEMINI" | "GROQ",
  defaults: { model: string; url: string }
): HostedConfig {
  const baseUrl = env[`${prefix}_BASE_URL`]?.trim() || defaults.url;
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(`${prefix}_BASE_URL must be a full address.`);
  }
  const isLocal = LOCAL_NAMES.includes(parsed.hostname.toLowerCase());
  if (
    parsed.protocol !== "https:" &&
    !(parsed.protocol === "http:" && isLocal)
  ) {
    throw new Error(`${prefix}_BASE_URL must use https.`);
  }
  return {
    apiKey: env[`${prefix}_API_KEY`]?.trim() || undefined,
    model: env[`${prefix}_MODEL`]?.trim() || defaults.model,
    baseUrl: baseUrl.replace(/\/$/, ""),
  };
}

export function readAiConfig(
  env: Record<string, string | undefined>
): AiConfig {
  const chosen = env.AI_PROVIDER?.trim().toLowerCase() || "claude";
  if (!isAiProviderId(chosen)) {
    throw new Error(
      'AI_PROVIDER must be "claude", "gemini", "groq" or "ollama".'
    );
  }
  const provider: AiProvider = chosen;

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
      provider === "ollama" ? DEFAULT_OLLAMA_TIMEOUT_MS : DEFAULT_TIMEOUT_MS,
      "AI_TIMEOUT_MS"
    ),
    gemini: readHosted(env, "GEMINI", {
      model: DEFAULT_GEMINI_MODEL,
      url: DEFAULT_GEMINI_URL,
    }),
    groq: readHosted(env, "GROQ", {
      model: DEFAULT_GROQ_MODEL,
      url: DEFAULT_GROQ_URL,
    }),
    timeouts: {
      claude: positiveInteger(
        env.AI_TIMEOUT_MS,
        DEFAULT_TIMEOUT_MS,
        "AI_TIMEOUT_MS"
      ),
      gemini: positiveInteger(
        env.AI_TIMEOUT_MS,
        DEFAULT_TIMEOUT_MS,
        "AI_TIMEOUT_MS"
      ),
      groq: positiveInteger(
        env.AI_TIMEOUT_MS,
        DEFAULT_TIMEOUT_MS,
        "AI_TIMEOUT_MS"
      ),
      ollama: positiveInteger(
        env.AI_TIMEOUT_MS,
        DEFAULT_OLLAMA_TIMEOUT_MS,
        "AI_TIMEOUT_MS"
      ),
    },
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

/** The configuration as if `provider` were the chosen one (its own timeout) */
export function configFor(config: AiConfig, provider: AiProvider): AiConfig {
  return { ...config, provider, timeoutMs: config.timeouts[provider] };
}

/** Removes the key from any text before it is shown or logged */
export function redact(text: string, apiKey: string | undefined): string {
  return apiKey ? text.split(apiKey).join("[redacted]") : text;
}
