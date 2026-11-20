import {
  AiRegistry,
  AiSettingsData,
  AiSettingsStore,
} from "@server/ai/ai-registry";
import { AiConfig, readAiConfig } from "@server/ai/ai-config";
import {
  createAiClients,
  createClientWithModel,
  defaultModels,
} from "@server/ai/ai-provider";
import { AiHttpResult, createAiRoutes } from "@server/ai/ai-routes";
import { AiClient, MessageSender } from "@server/ai/ai-types";
import { createAnthropicSender } from "@server/ai/claude-client";
import {
  createGeminiSender,
  createGroqSender,
} from "@server/ai/hosted-clients";
import { CvStorage } from "@shared/storage/cv-storage";
import { AiProviderId } from "@shared/ai/providers";

const KEYS_STORAGE = "squeezy-cv-ai-keys";
const CHOICE_STORAGE = "squeezy-cv-ai-choice";

/**
 * The user's own AI settings in browser mode. They live in this browser's localStorage only:
 * they are never sent anywhere but to the provider they belong to, and never part of a backup.
 */
export interface BrowserAiKeys {
  claude?: string;
  gemini?: string;
  groq?: string;

  /** The model of each online provider; empty means the recommended one */
  claudeModel?: string;
  geminiModel?: string;
  groqModel?: string;

  /** Use a local Ollama (it must allow this site, see the settings page) */
  isOllamaOn?: boolean;
  ollamaUrl?: string;
  ollamaModel?: string;
}

function readJson(key: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(key) ?? "{}"
    );
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function readBrowserAiKeys(): BrowserAiKeys {
  const raw = readJson(KEYS_STORAGE);
  return {
    claude: text(raw.claude),
    gemini: text(raw.gemini),
    groq: text(raw.groq),
    claudeModel: text(raw.claudeModel),
    geminiModel: text(raw.geminiModel),
    groqModel: text(raw.groqModel),
    isOllamaOn: raw.isOllamaOn === true,
    ollamaUrl: text(raw.ollamaUrl),
    ollamaModel: text(raw.ollamaModel),
  };
}

/** Saves the settings; an empty value removes that key */
export function writeBrowserAiKeys(keys: BrowserAiKeys): void {
  try {
    window.localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
  } catch {
    // Storage may be blocked; the settings then last only until the page is closed
  }
}

class LocalAiSettings implements AiSettingsStore {
  load(): Promise<AiSettingsData> {
    return Promise.resolve(readJson(CHOICE_STORAGE) as AiSettingsData);
  }

  save(settings: AiSettingsData): Promise<void> {
    try {
      window.localStorage.setItem(CHOICE_STORAGE, JSON.stringify(settings));
    } catch {
      // see writeBrowserAiKeys
    }
    return Promise.resolve();
  }
}

const NOT_SET_UP =
  "AI is not set up. Open Settings and add your own key (or turn on Ollama) to use it.";

/** The registry for what is saved now: a provider is set up when it has a key (Ollama when it is turned on) */
async function browserRegistry(
  keys: BrowserAiKeys = readBrowserAiKeys()
): Promise<AiRegistry> {
  const config = readAiConfig({
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    ANTHROPIC_API_KEY: keys.claude,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    ANTHROPIC_MODEL: keys.claudeModel,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    GEMINI_API_KEY: keys.gemini,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    GEMINI_MODEL: keys.geminiModel,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    GROQ_API_KEY: keys.groq,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    GROQ_MODEL: keys.groqModel,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    OLLAMA_URL: keys.ollamaUrl,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    OLLAMA_MODEL: keys.ollamaModel,
  });
  const clients: Partial<Record<AiProviderId, AiClient>> =
    createAiClients(config);
  if (!keys.isOllamaOn) {
    delete clients.ollama;
  }
  const first = (["claude", "gemini", "groq", "ollama"] as const).find(
    (id) => clients[id]
  );
  const registry = new AiRegistry(
    clients,
    first ?? "claude",
    new LocalAiSettings(),
    {
      clientFor: (provider, model) =>
        provider === "ollama" && !keys.isOllamaOn
          ? undefined
          : createClientWithModel(config, provider, model),
      defaultModels: defaultModels(config),
    }
  );
  await registry.load();
  return registry;
}

/** The AI routes (`/api/ai/*`) answered in the browser with the user's own key */
export async function handleBrowserAi(
  storage: CvStorage,
  method: string,
  path: string,
  body: unknown,
  isPreview: boolean
): Promise<AiHttpResult | undefined> {
  const routes = createAiRoutes({
    registry: await browserRegistry(),
    loadVault: () => storage.loadVault(),
    notConfigured: { tailoring: NOT_SET_UP, other: NOT_SET_UP },
  });
  return routes.handle(method, path, body, { isPreview });
}

/** What a key test says: a short message for the person, never the key */
export interface KeyTestResult {
  isOk: boolean;
  message: string;
}

type OnlineProvider = "claude" | "gemini" | "groq";

/** The config for one online provider with the key (and model) as typed */
function onlineConfig(
  provider: OnlineProvider,
  apiKey: string,
  model: string | undefined
): AiConfig {
  return readAiConfig({
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    ANTHROPIC_API_KEY: provider === "claude" ? apiKey : undefined,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    ANTHROPIC_MODEL: provider === "claude" ? model : undefined,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    GEMINI_API_KEY: provider === "gemini" ? apiKey : undefined,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    GEMINI_MODEL: provider === "gemini" ? model : undefined,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    GROQ_API_KEY: provider === "groq" ? apiKey : undefined,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    GROQ_MODEL: provider === "groq" ? model : undefined,
  });
}

/**
 * Tries a key with one tiny request (a JSON "ok", no CV data) straight from this browser to the
 * provider it belongs to. The key and model are used as typed, so they can be checked before
 * pressing Save, and the model is the one the app will really use (a retired model fails here).
 */
export async function testBrowserAiKey(
  provider: OnlineProvider,
  key: string,
  model?: string
): Promise<KeyTestResult> {
  const apiKey = key.trim();
  if (!apiKey) {
    return { isOk: false, message: "Paste a key first." };
  }
  const config = onlineConfig(provider, apiKey, model?.trim() || undefined);
  const senders: Record<OnlineProvider, () => MessageSender> = {
    claude: () => createAnthropicSender(config),
    gemini: () => createGeminiSender(config),
    groq: () => createGroqSender(config),
  };
  try {
    // The hosted senders always ask for JSON, and Groq refuses that unless the messages say "json"
    await senders[provider]()('Reply only with this JSON: {"ok": true}', [
      { role: "user", content: "Answer in JSON." },
    ]);
    return { isOk: true, message: "The key works." };
  } catch (error) {
    return {
      isOk: false,
      message:
        error instanceof Error
          ? error.message
          : "The service could not be reached.",
    };
  }
}

const LIST_TIMEOUT_MS = 10_000;

async function getJson(
  url: string,
  headers: Record<string, string>
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    return response.ok ? await response.json() : undefined;
  } finally {
    clearTimeout(timer);
  }
}

function names(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/**
 * The models a key can use, asked from the provider itself, to offer as suggestions. Best effort:
 * any failure (blocked by the provider, offline, a changed answer) gives an empty list and the
 * person simply types a model name.
 */
export async function listProviderModels(
  provider: OnlineProvider,
  key: string
): Promise<string[]> {
  const apiKey = key.trim();
  if (!apiKey) {
    return [];
  }
  const config = onlineConfig(provider, apiKey, undefined);
  try {
    if (provider === "claude") {
      const answer = (await getJson(
        "https://api.anthropic.com/v1/models?limit=100",
        {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        }
      )) as { data?: { id?: unknown }[] } | undefined;
      return names(answer?.data?.map((model) => model.id));
    }
    if (provider === "gemini") {
      const answer = (await getJson(
        `${config.gemini.baseUrl}/v1beta/models?pageSize=200`,
        { "x-goog-api-key": apiKey }
      )) as
        | {
            models?: { name?: unknown; supportedGenerationMethods?: unknown }[];
          }
        | undefined;
      return names(
        answer?.models
          ?.filter((model) =>
            names(model.supportedGenerationMethods).includes("generateContent")
          )
          .map((model) =>
            typeof model.name === "string"
              ? model.name.replace(/^models\//, "")
              : undefined
          )
      );
    }
    const answer = (await getJson(`${config.groq.baseUrl}/v1/models`, {
      authorization: `Bearer ${apiKey}`,
    })) as { data?: { id?: unknown }[] } | undefined;
    return names(answer?.data?.map((model) => model.id));
  } catch {
    return [];
  }
}
