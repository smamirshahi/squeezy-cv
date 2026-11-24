import { AiConfig, AiProvider, configFor } from "@server/ai/ai-config";
import { AiClient } from "@server/ai/ai-types";
import { ClaudeAiClient, createAiClient } from "@server/ai/claude-client";
import { createOllamaSender } from "@server/ai/ollama-client";
import {
  createGeminiSender,
  createGroqSender,
} from "@server/ai/hosted-clients";
import {
  AI_PROVIDER_IDS,
  AiTask,
  CLAUDE_TASK_MODELS,
} from "@shared/ai/providers";

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

/** The model a provider uses when a task does not choose one */
function modelOf(config: AiConfig, provider: AiProvider): string {
  switch (provider) {
    case "claude":
      return config.model;
    case "gemini":
      return config.gemini.model;
    case "groq":
      return config.groq.model;
    case "ollama":
      return config.ollama.model;
  }
}

/** The model each provider uses when a task does not choose one */
export function defaultModels(config: AiConfig): Record<AiProvider, string> {
  return Object.fromEntries(
    AI_PROVIDER_IDS.map((id) => [id, modelOf(config, id)])
  ) as Record<AiProvider, string>;
}

/**
 * The model a task uses when the user has not chosen one for it (#551): Haiku or Sonnet for
 * Claude, unless a model was set in `.env` / the browser settings (that one is then used for
 * everything). Undefined for the other providers: they use their usual model.
 */
export function taskDefaultModel(
  config: AiConfig,
  provider: AiProvider,
  task: AiTask
): string | undefined {
  return provider === "claude" && !config.isModelChosen
    ? CLAUDE_TASK_MODELS[task]
    : undefined;
}

/** A client for `provider` that uses `model` instead of its usual one (undefined when it cannot be used) */
export function createClientWithModel(
  config: AiConfig,
  provider: AiProvider,
  model: string
): AiClient | undefined {
  let next: AiConfig;
  if (provider === "claude") {
    next = { ...config, model };
  } else if (provider === "ollama") {
    next = { ...config, ollama: { ...config.ollama, model } };
  } else {
    next = { ...config, [provider]: { ...config[provider], model } };
  }
  return createConfiguredAi(configFor(next, provider));
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

/**
 * A Gemini client that reads web pages itself (URL context): it is given a link and Google
 * fetches the page. Undefined without a Gemini key. Separate from the task clients because it
 * is Gemini-only, whichever provider the user chose for the tasks.
 */
function createGeminiUrlClient(config: AiConfig): AiClient | undefined {
  const gemini = configFor(config, "gemini");
  return gemini.gemini.apiKey
    ? new ClaudeAiClient(
        createGeminiSender(gemini, fetch, { isUrlContext: true }),
        gemini.gemini.apiKey
      )
    : undefined;
}

/** The URL-reading client with the model it uses, for the registry */
export function urlReaderOf(
  config: AiConfig
): { client: AiClient; model: string } | undefined {
  const client = createGeminiUrlClient(config);
  return client ? { client, model: config.gemini.model } : undefined;
}
