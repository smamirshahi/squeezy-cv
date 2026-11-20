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

/** A model name per task: a task without one uses its provider's model */
export type AiTaskModels = Partial<Record<AiTask, string>>;

/**
 * The provider per task, and the model per task in `models` (older files have neither `models`
 * nor, once, a `maskOrganisations` flag, now ignored)
 */
export type AiSettingsData = Partial<Record<AiTask, string>> & {
  models?: AiTaskModels;
};

const MAX_MODEL_LENGTH = 120;

/** What lets a task use another model than its provider's: how to build that client, and what each provider uses by default */
export interface AiModelSupport {
  clientFor?: (provider: AiProviderId, model: string) => AiClient | undefined;
  defaultModels?: Partial<Record<AiProviderId, string>>;
}

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

export class AiChoiceError extends Error {}

export interface ProviderStatus extends AiProviderInfo {
  /** Has what it needs (a key for the online ones) */
  isConfigured: boolean;

  /** The model this provider uses when a task does not choose one */
  defaultModel?: string;
}

/**
 * The AI clients that can be used, and which one each task uses. The default is the provider
 * from .env; a choice made in the app (kept in the settings store) overrides it, but only for
 * providers that are set up. Pure bookkeeping: the clients do the talking.
 */
export class AiRegistry {
  private current: AiChoice;
  private taskModels: AiTaskModels = {};
  private readonly modelClients = new Map<string, AiClient | undefined>();

  constructor(
    private readonly clients: Partial<Record<AiProviderId, AiClient>>,
    defaultProvider: AiProviderId,
    private readonly settings: AiSettingsStore = new MemoryAiSettings(),
    private readonly support: AiModelSupport = {}
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
      const model = saved.models?.[task];
      if (
        this.support.clientFor &&
        typeof model === "string" &&
        model.trim() &&
        this.current[task] === wanted
      ) {
        this.taskModels[task] = model.trim().slice(0, MAX_MODEL_LENGTH);
      }
    }
  }

  /** Employer and school names are always replaced by placeholders before text is sent (#271) */
  isMaskingOrganisations(): boolean {
    return true;
  }

  choice(): AiChoice {
    return { ...this.current };
  }

  /** The model each task chose; a task that is missing uses its provider's model */
  models(): AiTaskModels {
    return { ...this.taskModels };
  }

  providers(): ProviderStatus[] {
    return AI_PROVIDER_IDS.map((id) => ({
      ...AI_PROVIDER_INFO[id],
      isConfigured: this.clients[id] !== undefined,
      defaultModel: this.support.defaultModels?.[id],
    }));
  }

  /** The client for a task (undefined when its provider is not set up) and which provider that is */
  forTask(task: AiTask): {
    client: AiClient | undefined;
    provider: AiProviderId;
  } {
    const provider = this.current[task];
    const model = this.taskModels[task];
    if (model && this.support.clientFor) {
      const key = `${provider}\u0000${model}`;
      if (!this.modelClients.has(key)) {
        this.modelClients.set(key, this.support.clientFor(provider, model));
      }
      return { client: this.modelClients.get(key), provider };
    }
    return { client: this.clients[provider], provider };
  }

  /**
   * Changes the provider of some tasks and the model of some tasks, and remembers it. Only
   * set-up providers can be chosen. A task whose provider changes forgets its model (a model name
   * belongs to one provider); an empty model name goes back to the provider's model.
   */
  async choose(
    change: Partial<Record<AiTask, string>>,
    models: Partial<Record<AiTask, string>> = {}
  ): Promise<AiChoice> {
    const next = { ...this.current };
    const nextModels = { ...this.taskModels };
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
      if (next[task as AiTask] !== provider) {
        delete nextModels[task as AiTask];
      }
      next[task as AiTask] = provider;
    }
    for (const [task, model] of Object.entries(models)) {
      if (!(AI_TASKS as readonly string[]).includes(task)) {
        throw new AiChoiceError(`Unknown task "${task}".`);
      }
      const name = typeof model === "string" ? model.trim() : undefined;
      if (name === undefined || name.length > MAX_MODEL_LENGTH) {
        throw new AiChoiceError(
          `A model name must be text of at most ${MAX_MODEL_LENGTH} characters.`
        );
      }
      if (!name) {
        delete nextModels[task as AiTask];
      } else if (this.support.clientFor) {
        nextModels[task as AiTask] = name;
      } else {
        throw new AiChoiceError("Choosing a model is not available here.");
      }
    }
    this.current = next;
    this.taskModels = nextModels;
    await this.settings.save({ ...next, models: nextModels });
    return this.choice();
  }
}
