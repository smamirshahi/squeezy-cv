import {
  AiRegistry,
  AiSettingsData,
  AiSettingsStore,
} from "@server/ai/ai-registry";
import { readAiConfig } from "@server/ai/ai-config";
import { createAiClients } from "@server/ai/ai-provider";
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
    GEMINI_API_KEY: keys.gemini,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    GROQ_API_KEY: keys.groq,
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
    new LocalAiSettings()
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

/** The cheapest Claude model: a key test needs no more */
const TEST_CLAUDE_MODEL = "claude-haiku-5-5";

/** What a key test says: a short message for the person, never the key */
export interface KeyTestResult {
  isOk: boolean;
  message: string;
}

/**
 * Tries a key with one tiny request (a JSON "ok", no CV data) straight from this browser to the
 * provider it belongs to. The key is used as typed, so it can be checked before pressing Save.
 */
export async function testBrowserAiKey(
  provider: "claude" | "gemini" | "groq",
  key: string
): Promise<KeyTestResult> {
  const apiKey = key.trim();
  if (!apiKey) {
    return { isOk: false, message: "Paste a key first." };
  }
  const config = readAiConfig({
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    ANTHROPIC_API_KEY: provider === "claude" ? apiKey : undefined,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    ANTHROPIC_MODEL: TEST_CLAUDE_MODEL,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    GEMINI_API_KEY: provider === "gemini" ? apiKey : undefined,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env names
    GROQ_API_KEY: provider === "groq" ? apiKey : undefined,
  });
  const senders: Record<typeof provider, () => MessageSender> = {
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
