import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "@server/app";
import {
  AiChoiceError,
  AiRegistry,
  FileAiSettings,
  MemoryAiSettings,
} from "@server/ai/ai-registry";
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
    });
    expect(settings.saved?.import).toBe("ollama");

    // a new run reads it back
    const again = new AiRegistry({ claude, ollama }, "claude", settings);
    await again.load();
    expect(again.forTask("import").provider).toBe("ollama");
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
    };
    const registry = new AiRegistry({ ollama }, "ollama", settings);
    await registry.load();
    expect(registry.choice().tailor).toBe("ollama");
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
    });
    expect(await store.load()).toEqual({
      tailor: "claude",
      import: "ollama",
      hide: "claude",
      chat: "claude",
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
