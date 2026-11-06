import { AiConfig } from "@server/ai/ai-config";
import { AiClient } from "@server/ai/ai-types";
import { ClaudeAiClient, createAiClient } from "@server/ai/claude-client";
import { createOllamaSender } from "@server/ai/ollama-client";

/** Whether the chosen provider can be used: Claude needs a key, Ollama needs nothing */
export function isAiAvailable(config: AiConfig): boolean {
  return config.provider === "ollama" || Boolean(config.apiKey);
}

/**
 * The AI client for the chosen provider, or undefined when it cannot be used (Claude without a
 * key). Both providers share the same checking and retrying (`ClaudeAiClient`, whose name
 * is historical): only the sender that talks to the model differs.
 */
export function createConfiguredAi(config: AiConfig): AiClient | undefined {
  if (!isAiAvailable(config)) {
    return undefined;
  }
  return config.provider === "ollama"
    ? new ClaudeAiClient(createOllamaSender(config))
    : createAiClient(config);
}
