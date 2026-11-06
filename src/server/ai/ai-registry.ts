import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { AiClient } from "@server/ai/ai-types";
import {
  AI_PROVIDER_IDS,
  AI_PROVIDER_INFO,
  AI_TASKS,
  AiChoice,
  AiProviderId,
  AiProviderInfo,
  AiTask,
  isAiProviderId,
} from "@shared/ai/providers";

/** Where the user's choice of provider per task is kept between runs (never a key) */
export interface AiSettingsStore {
  load: () => Promise<AiSettingsData>;
  save: (settings: AiSettingsData) => Promise<void>;
}

/** The provider per task, and whether employer and school names are masked too (#133) */
export type AiSettingsData = Partial<Record<AiTask, string>> & {
  maskOrganisations?: boolean;
};

export class MemoryAiSettings implements AiSettingsStore {
  saved: AiSettingsData | undefined;

  load(): Promise<AiSettingsData> {
    return Promise.resolve(this.saved ?? {});
  }

  save(settings: AiSettingsData): Promise<void> {
    this.saved = settings;
    return Promise.resolve();
  }
}

/** A small JSON file (written atomically). A missing or unreadable file means "no choice made". */
export class FileAiSettings implements AiSettingsStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<AiSettingsData> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.filePath, "utf8"));
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  async save(settings: AiSettingsData): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.tmp`;
    await writeFile(temp, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    await rename(temp, this.filePath);
  }
}

export class AiChoiceError extends Error {}

export interface ProviderStatus extends AiProviderInfo {
  /** Has what it needs (a key for the online ones) */
  isConfigured: boolean;
}

/**
 * The AI clients that can be used, and which one each task uses. The default is the provider
 * from .env; a choice made in the app (kept in the settings store) overrides it, but only for
 * providers that are set up. Pure bookkeeping: the clients do the talking.
 */
export class AiRegistry {
  private current: AiChoice;
  private isMasking = false;

  constructor(
    private readonly clients: Partial<Record<AiProviderId, AiClient>>,
    defaultProvider: AiProviderId,
    private readonly settings: AiSettingsStore = new MemoryAiSettings()
  ) {
    this.current = AiRegistry.allTasks(defaultProvider);
  }

  /** One client for everything (what the tests and older wiring use) */
  static single(
    client: AiClient | undefined,
    provider: AiProviderId
  ): AiRegistry {
    return new AiRegistry(client ? { [provider]: client } : {}, provider);
  }

  private static allTasks(provider: AiProviderId): AiChoice {
    return Object.fromEntries(
      AI_TASKS.map((task) => [task, provider])
    ) as AiChoice;
  }

  /** Reads the saved choice; entries for providers that are not set up are ignored */
  async load(): Promise<void> {
    const saved = await this.settings.load();
    for (const task of AI_TASKS) {
      const wanted = saved[task];
      if (isAiProviderId(wanted) && this.clients[wanted]) {
        this.current[task] = wanted;
      }
    }
    this.isMasking = saved.maskOrganisations === true;
  }

  /** Whether employer and school names are also replaced by placeholders before text is sent */
  isMaskingOrganisations(): boolean {
    return this.isMasking;
  }

  async setMaskOrganisations(isMasking: boolean): Promise<void> {
    this.isMasking = isMasking;
    await this.settings.save({
      ...this.current,
      maskOrganisations: isMasking,
    });
  }

  choice(): AiChoice {
    return { ...this.current };
  }

  providers(): ProviderStatus[] {
    return AI_PROVIDER_IDS.map((id) => ({
      ...AI_PROVIDER_INFO[id],
      isConfigured: this.clients[id] !== undefined,
    }));
  }

  /** The client for a task (undefined when its provider is not set up) and which provider that is */
  forTask(task: AiTask): {
    client: AiClient | undefined;
    provider: AiProviderId;
  } {
    const provider = this.current[task];
    return { client: this.clients[provider], provider };
  }

  /** Changes the provider of some tasks and remembers it. Only set-up providers can be chosen. */
  async choose(change: Partial<Record<AiTask, string>>): Promise<AiChoice> {
    const next = { ...this.current };
    for (const [task, provider] of Object.entries(change)) {
      if (!(AI_TASKS as readonly string[]).includes(task)) {
        throw new AiChoiceError(`Unknown task "${task}".`);
      }
      if (!isAiProviderId(provider)) {
        throw new AiChoiceError(`Unknown provider "${provider}".`);
      }
      if (!this.clients[provider]) {
        throw new AiChoiceError(
          `${AI_PROVIDER_INFO[provider].label} is not set up. Add its key or start it, then restart the server.`
        );
      }
      next[task as AiTask] = provider;
    }
    this.current = next;
    await this.settings.save({
      ...next,
      maskOrganisations: this.isMasking,
    });
    return this.choice();
  }
}
