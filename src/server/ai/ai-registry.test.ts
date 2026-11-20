import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "@server/app";
import {
  AiChoiceError,
  AiRegistry,
  MemoryAiSettings,
} from "@server/ai/ai-registry";
import { FileAiSettings } from "@server/ai/ai-settings-file";
import { AiClient, GenerateRequest } from "@server/ai/ai-types";
import { FileCvStorage } from "@server/storage/file-cv-storage";

class Named implements AiClient {
  calls: string[] = [];
  constructor(
    readonly name: string,
    private readonly answer: unknown = { hide: [] }
  ) {}
  generate<T>(request: GenerateRequest<T>): Promise<T> {
    this.calls.push(request.promptName);
    return Promise.resolve(request.schema.check(this.answer));
  }
}

describe("AiRegistry", () => {
  const claude = new Named("claude");
  const ollama = new Named("ollama");

  it("uses the default provider for every task", () => {
    const registry = new AiRegistry({ claude, ollama }, "claude");
    expect(registry.choice()).toEqual({
      tailor: "claude",
      import: "claude",
      hide: "claude",
      chat: "claude",
      place: "claude",
    });
    expect(registry.forTask("hide")).toEqual({
      client: claude,
      provider: "claude",
    });
  });

  it("reports which providers are set up, online or offline", () => {
    const registry = new AiRegistry({ ollama }, "ollama");
    const providers = registry.providers();
    expect(providers.find((p) => p.id === "claude")).toMatchObject({
      isConfigured: false,
      isOnline: true,
    });
    expect(providers.find((p) => p.id === "ollama")).toMatchObject({
      isConfigured: true,
      isOnline: false,
    });
  });

  it("changes the provider of one task, remembers it, and leaves the others", async () => {
    const settings = new MemoryAiSettings();
    const registry = new AiRegistry({ claude, ollama }, "claude", settings);
    await registry.choose({ import: "ollama" });
    expect(registry.choice()).toEqual({
      tailor: "claude",
      import: "ollama",
      hide: "claude",
      chat: "claude",
      place: "claude",
    });
    expect(settings.saved?.import).toBe("ollama");

    // a new run reads it back
    const again = new AiRegistry({ claude, ollama }, "claude", settings);
    await again.load();
    expect(again.forTask("import").provider).toBe("ollama");
  });

  it("always masks employer and school names (#271)", () => {
    const registry = new AiRegistry({ claude, ollama }, "claude");
    expect(registry.isMaskingOrganisations()).toBe(true);
  });

  it("refuses a provider that is not set up, an unknown one and an unknown task", async () => {
    const registry = new AiRegistry({ ollama }, "ollama");
    await expect(registry.choose({ tailor: "claude" })).rejects.toThrow(
      /not set up/
    );
    await expect(registry.choose({ tailor: "gpt" })).rejects.toBeInstanceOf(
      AiChoiceError
    );
    await expect(
      registry.choose({ gossip: "ollama" } as never)
    ).rejects.toBeInstanceOf(AiChoiceError);
    expect(registry.choice().tailor).toBe("ollama");
  });

  it("ignores a saved choice whose provider is no longer set up", async () => {
    const settings = new MemoryAiSettings();
    settings.saved = {
      tailor: "claude",
      import: "claude",
      hide: "claude",
      chat: "claude",
      place: "claude",
    };
    const registry = new AiRegistry({ ollama }, "ollama", settings);
    await registry.load();
    expect(registry.choice().tailor).toBe("ollama");
  });
});

describe("AiRegistry: a model per task", () => {
  const claude = new Named("claude");
  const ollama = new Named("ollama");
  const built: string[] = [];
  const support = {
    clientFor: (provider: string, model: string) => {
      built.push(`${provider}:${model}`);
      return new Named(`${provider}:${model}`);
    },
    defaultModels: { claude: "claude-default", ollama: "llama-default" },
  };
  function make(settings = new MemoryAiSettings()): AiRegistry {
    built.length = 0;
    return new AiRegistry({ claude, ollama }, "claude", settings, support);
  }

  it("uses the provider's own client until a task chooses a model, then a client with that model for that task only", async () => {
    const registry = make();
    expect(registry.forTask("hide").client).toBe(claude);
    await registry.choose({}, { hide: "  claude-small " });
    expect(registry.models()).toEqual({ hide: "claude-small" });
    expect((registry.forTask("hide").client as Named).name).toBe(
      "claude:claude-small"
    );
    expect(registry.forTask("chat").client).toBe(claude);
    // the same model builds its client once
    registry.forTask("hide");
    expect(built).toEqual(["claude:claude-small"]);
  });

  it("goes back to the provider's model with an empty name", async () => {
    const registry = make();
    await registry.choose({}, { hide: "m" });
    await registry.choose({}, { hide: " " });
    expect(registry.models()).toEqual({});
    expect(registry.forTask("hide").client).toBe(claude);
  });

  it("forgets a task's model when its provider changes, but keeps it when the provider stays", async () => {
    const registry = make();
    await registry.choose({}, { hide: "m", chat: "n" });
    await registry.choose({ hide: "claude" });
    expect(registry.models()).toEqual({ hide: "m", chat: "n" });
    await registry.choose({ hide: "ollama" });
    expect(registry.models()).toEqual({ chat: "n" });
    expect(registry.forTask("hide").client).toBe(ollama);
  });

  it("takes a provider and a model for the same task in one change", async () => {
    const registry = make();
    await registry.choose({ hide: "ollama" }, { hide: "llama3.2" });
    expect((registry.forTask("hide").client as Named).name).toBe(
      "ollama:llama3.2"
    );
  });

  it("remembers models next to the choice, and reads them back", async () => {
    const settings = new MemoryAiSettings();
    await make(settings).choose({ chat: "ollama" }, { chat: "llama3.2" });
    expect(settings.saved?.models).toEqual({ chat: "llama3.2" });
    expect(settings.saved?.chat).toBe("ollama");
    const again = make(settings);
    await again.load();
    expect(again.models()).toEqual({ chat: "llama3.2" });
  });

  it("loads an old settings file that has no models", async () => {
    const settings = new MemoryAiSettings();
    settings.saved = { tailor: "ollama" };
    const registry = make(settings);
    await registry.load();
    expect(registry.models()).toEqual({});
    expect(registry.forTask("tailor").provider).toBe("ollama");
  });

  it("ignores a saved model whose task no longer uses the saved provider", async () => {
    const settings = new MemoryAiSettings();
    settings.saved = { tailor: "gemini", models: { tailor: "x" } };
    const registry = make(settings);
    await registry.load();
    expect(registry.models()).toEqual({});
  });

  it("refuses an unknown task, a model that is not text or too long, and any model where models are not supported", async () => {
    const registry = make();
    await expect(
      registry.choose({}, { gossip: "m" } as never)
    ).rejects.toBeInstanceOf(AiChoiceError);
    await expect(
      registry.choose({}, { hide: 5 } as never)
    ).rejects.toBeInstanceOf(AiChoiceError);
    await expect(
      registry.choose({}, { hide: "x".repeat(121) })
    ).rejects.toBeInstanceOf(AiChoiceError);
    const plain = new AiRegistry({ claude }, "claude");
    await expect(plain.choose({}, { hide: "m" })).rejects.toThrow(
      /not available/
    );
    expect(registry.models()).toEqual({});
  });

  it("tells each provider's default model", () => {
    const providers = make().providers();
    expect(providers.find((p) => p.id === "claude")?.defaultModel).toBe(
      "claude-default"
    );
    expect(providers.find((p) => p.id === "groq")?.defaultModel).toBe(
      undefined
    );
  });
});

describe("FileAiSettings", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cv-ai-settings-"));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it("round-trips the choice and treats a missing or broken file as no choice", async () => {
    const file = path.join(dir, "sub", "settings.json");
    const store = new FileAiSettings(file);
    expect(await store.load()).toEqual({});
    await store.save({
      tailor: "claude",
      import: "ollama",
      hide: "claude",
      chat: "claude",
      place: "claude",
    });
    expect(await store.load()).toEqual({
      tailor: "claude",
      import: "ollama",
      hide: "claude",
      chat: "claude",
      place: "claude",
    });
    await store.save({ tailor: "claude", models: { tailor: "m" } });
    expect(await store.load()).toEqual({
      tailor: "claude",
      models: { tailor: "m" },
    });
    expect(await readFile(file, "utf8")).not.toContain("KEY");
    await rm(file);
    await import("node:fs/promises").then((fs) => fs.writeFile(file, "{ nope"));
    expect(await store.load()).toEqual({});
  });
});

describe("the AI routes with a registry", () => {
  let dir: string;
  let app: FastifyInstance;
  const claude = new Named("claude");
  const ollama = new Named("ollama", { hide: [] });

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cv-ai-routes-"));
    claude.calls.length = 0;
    ollama.calls.length = 0;
    app = buildServer({
      storage: new FileCvStorage(dir),
      aiRegistry: new AiRegistry(
        { claude, ollama },
        "claude",
        new MemoryAiSettings()
      ),
    });
  });
  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  const hideBody = {
    linesOver: 2,
    candidates: [
      { itemId: "a", label: "A", section: "S", lines: 3, relevance: 10 },
    ],
  };

  it("status lists the providers and the choice, with tailoring's provider on top", async () => {
    const status = (
      await app.inject({ method: "GET", url: "/api/ai/status" })
    ).json();
    expect(status).toMatchObject({ isConfigured: true, provider: "claude" });
    expect(status.providers.map((p: { id: string }) => p.id)).toEqual([
      "claude",
      "gemini",
      "groq",
      "ollama",
    ]);
    // only the ones with a client are set up
    expect(
      status.providers
        .filter((p: { isConfigured: boolean }) => p.isConfigured)
        .map((p: { id: string }) => p.id)
    ).toEqual(["claude", "ollama"]);
    expect(status.choice).toEqual({
      tailor: "claude",
      import: "claude",
      hide: "claude",
      chat: "claude",
      place: "claude",
    });
  });

  it("each task goes to the provider chosen for it", async () => {
    const put = await app.inject({
      method: "PUT",
      url: "/api/ai/choice",
      payload: { hide: "ollama" },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().choice.hide).toBe("ollama");
    await app.inject({
      method: "POST",
      url: "/api/ai/hide",
      payload: hideBody,
    });
    expect(ollama.calls).toEqual(["pick-hide"]);
    expect(claude.calls).toEqual([]);
    const status = (
      await app.inject({ method: "GET", url: "/api/ai/status" })
    ).json();
    expect(status.provider).toBe("claude");
    expect(status.choice.hide).toBe("ollama");
  });

  it("sets a task's model over the route, shows it in the status and calls that model", async () => {
    const small = new Named("small", { hide: [] });
    const registryApp = buildServer({
      storage: new FileCvStorage(dir),
      aiRegistry: new AiRegistry({ claude }, "claude", new MemoryAiSettings(), {
        clientFor: () => small,
        defaultModels: { claude: "claude-default" },
      }),
    });
    const put = await registryApp.inject({
      method: "PUT",
      url: "/api/ai/choice",
      payload: { models: { hide: "claude-small" } },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().models).toEqual({ hide: "claude-small" });
    await registryApp.inject({
      method: "POST",
      url: "/api/ai/hide",
      payload: hideBody,
    });
    expect(small.calls).toEqual(["pick-hide"]);
    expect(claude.calls).toEqual([]);
    const status = (
      await registryApp.inject({ method: "GET", url: "/api/ai/status" })
    ).json();
    expect(status.models).toEqual({ hide: "claude-small" });
    expect(
      status.providers.find((p: { id: string }) => p.id === "claude")
        .defaultModel
    ).toBe("claude-default");
    await registryApp.close();
  });

  it("refuses models that are not an object, or a model when the registry cannot choose one", async () => {
    const bad = await app.inject({
      method: "PUT",
      url: "/api/ai/choice",
      payload: { models: "x" },
    });
    expect(bad.statusCode).toBe(400);
    const unsupported = await app.inject({
      method: "PUT",
      url: "/api/ai/choice",
      payload: { models: { hide: "m" } },
    });
    expect(unsupported.statusCode).toBe(400);
  });

  it("has no switch for masking employer and school names any more (#271)", async () => {
    const put = await app.inject({
      method: "PUT",
      url: "/api/ai/privacy",
      payload: { maskOrganisations: false },
    });
    expect(put.statusCode).toBe(404);
  });

  it("refuses a bad choice with 400 and keeps the old one", async () => {
    const put = await app.inject({
      method: "PUT",
      url: "/api/ai/choice",
      payload: { tailor: "gemini" },
    });
    expect(put.statusCode).toBe(400);
    expect(put.json().code).toBe("provider_unavailable");
    const status = (
      await app.inject({ method: "GET", url: "/api/ai/status" })
    ).json();
    expect(status.choice.tailor).toBe("claude");
  });
});
