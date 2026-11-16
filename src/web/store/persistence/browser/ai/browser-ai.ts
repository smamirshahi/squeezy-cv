import {
  AiRegistry,
  AiSettingsData,
  AiSettingsStore,
} from "@server/ai/ai-registry";
import { readAiConfig } from "@server/ai/ai-config";
import { createAiClients } from "@server/ai/ai-provider";
import { AiHttpResult, createAiRoutes } from "@server/ai/ai-routes";
import { AiClient } from "@server/ai/ai-types";
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
