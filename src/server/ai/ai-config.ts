export interface AiConfig {
  /** Secret. Only ever read on the server; never sent to the browser or logged. */
  apiKey: string | undefined;
  model: string;
  timeoutMs: number;
}

const DEFAULT_MODEL = "claude-opus-5-5";
const DEFAULT_TIMEOUT_MS = 120_000;

/** Reads ANTHROPIC_API_KEY, ANTHROPIC_MODEL and AI_TIMEOUT_MS (see `.env.example`) */
export function readAiConfig(
  env: Record<string, string | undefined>
): AiConfig {
  const timeoutMs = env.AI_TIMEOUT_MS
    ? Number(env.AI_TIMEOUT_MS)
    : DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("AI_TIMEOUT_MS must be a positive whole number.");
  }
  return {
    apiKey: env.ANTHROPIC_API_KEY?.trim() || undefined,
    model: env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
    timeoutMs,
  };
}

/** Removes the key from any text before it is shown or logged */
export function redact(text: string, apiKey: string | undefined): string {
  return apiKey ? text.split(apiKey).join("[redacted]") : text;
}
