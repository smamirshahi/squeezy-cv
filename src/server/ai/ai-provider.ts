import { AiConfig, AiProvider, configFor } from "@server/ai/ai-config";
import { AiClient } from "@server/ai/ai-types";
import { ClaudeAiClient, createAiClient } from "@server/ai/claude-client";
import { createOllamaSender } from "@server/ai/ollama-client";
import {
  createGeminiSender,
  createGroqSender,
} from "@server/ai/hosted-clients";
import { AI_PROVIDER_IDS } from "@shared/ai/providers";

/** Whether the chosen provider can be used: the online ones need a key, Ollama needs nothing */
export function isAiAvailable(config: AiConfig): boolean {
  switch (config.provider) {
    case "ollama":
      return true;
    case "claude":
      return Boolean(config.apiKey);
    case "gemini":
      return Boolean(config.gemini.apiKey);
    case "groq":
      return Boolean(config.groq.apiKey);
  }
}

/**
 * The AI client for the chosen provider, or undefined when it cannot be used (no key). All
 * providers share the same checking and retrying (`ClaudeAiClient`, whose name is historical):
 * only the sender that talks to the model differs, and the key it must keep out of errors.
 */
export function createConfiguredAi(config: AiConfig): AiClient | undefined {
  if (!isAiAvailable(config)) {
    return undefined;
  }
  switch (config.provider) {
    case "ollama":
      return new ClaudeAiClient(createOllamaSender(config));
    case "gemini":
      return new ClaudeAiClient(
        createGeminiSender(config),
        config.gemini.apiKey
      );
    case "groq":
      return new ClaudeAiClient(createGroqSender(config), config.groq.apiKey);
    case "claude":
      return createAiClient(config);
  }
}

/** Every provider that can be used right now (has its key; Ollama is only found missing when asked) */
export function createAiClients(
  config: AiConfig
): Partial<Record<AiProvider, AiClient>> {
  const clients: Partial<Record<AiProvider, AiClient>> = {};
  for (const provider of AI_PROVIDER_IDS) {
    const client = createConfiguredAi(configFor(config, provider));
    if (client) {
      clients[provider] = client;
    }
  }
  return clients;
}
