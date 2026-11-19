// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { loadPrompt } from "@server/ai/prompts";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { IdbCvStorage } from "@store/persistence/browser/idb-cv-storage";
import { openKvStore } from "@store/persistence/browser/idb-kv";
import { createLocalFetch } from "@store/persistence/browser/local-api";
import {
  listProviderModels,
  readBrowserAiKeys,
  testBrowserAiKey,
  writeBrowserAiKeys,
} from "@store/persistence/browser/ai/browser-ai";

const file = migrateCvFile(sample);
const NAME = file.vault.profile.fullName;
let counter = 0;
let local: ReturnType<typeof createLocalFetch>;

async function post(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; json: Record<string, unknown> }> {
  const response = await local(path, {
    method: "POST",

    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}

beforeEach(async () => {
  counter += 1;
  window.localStorage.clear();
  const storage = new IdbCvStorage(openKvStore(`ai-db-${counter}`));
  await storage.saveVault(file);
  local = createLocalFetch(storage);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AI in the browser", () => {
  it("bundles every prompt as text", () => {
    for (const name of [
      "ats-wording",
      "chat-edit",
      "extract-requirements",
      "generate-bullets",
      "import-cv",
      "json-only",
      "pick-hide",
      "place-items",
      "reword-text",
      "rewrite-bullet",
      "score-section",
    ]) {
      expect(loadPrompt(name).length).toBeGreaterThan(20);
    }
    expect(() => loadPrompt("nope")).toThrow();
  });

  it("says what to do when there is no key, and lists nothing as set up", async () => {
    const answer = await post("/api/ai/analyse", {
      jobAd: "We need a developer",
    });
    expect(answer.status).toBe(503);
    expect(answer.json.code).toBe("ai_not_configured");
    expect(String(answer.json.message)).toMatch(/Settings/);
    const status = await (await local("/api/ai/status")).json();
    expect(status.isConfigured).toBe(false);
    expect(
      (status.providers as { isConfigured: boolean }[]).some(
        (p) => p.isConfigured
      )
    ).toBe(false);
  });

  it("previews the exact request with personal details masked, without a key and without sending", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const answer = await post(
      "/api/ai/analyse",
      { jobAd: `Contact ${NAME} about this developer job` },
      { "x-ai-preview": "1" }
    );
    expect(answer.status).toBe(200);
    const sent = JSON.stringify(answer.json.calls);
    expect(sent).not.toContain(NAME);
    expect(sent).toContain("developer job");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the user's own Gemini key and keeps the key out of what is sent to the model", async () => {
    writeBrowserAiKeys({ gemini: "secret-key-123" });
    const reply = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  keywords: ["react"],
                  requirements: [],
                  jobTitle: "Developer",
                }),
              },
            ],
          },
          finishReason: "STOP",
        },
      ],
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(reply), { status: 200 }));
    const answer = await post("/api/ai/analyse", {
      jobAd: "We need a React developer",
    });
    // The stand-in answer is not what the task wants, so it asks again: every call goes to Gemini
    expect(fetchSpy).toHaveBeenCalled();
    for (const [url, init] of fetchSpy.mock.calls) {
      expect(String(url as string)).toContain(
        "generativelanguage.googleapis.com"
      );
      expect(String(init?.body as string)).not.toContain("secret-key-123");
    }
    expect([200, 502]).toContain(answer.status);
  });

  it("keeps keys in the browser's own storage and reads them back", () => {
    writeBrowserAiKeys({
      claude: "k1",
      isOllamaOn: true,
      ollamaModel: "llama3.2",
    });
    expect(readBrowserAiKeys()).toMatchObject({
      claude: "k1",
      isOllamaOn: true,
      ollamaModel: "llama3.2",
    });
  });

  it("keeps the chosen model of each provider and reads it back", () => {
    writeBrowserAiKeys({
      gemini: "k",
      geminiModel: "gemini-x",
      groqModel: " ",
    });
    expect(readBrowserAiKeys()).toMatchObject({
      geminiModel: "gemini-x",
      groqModel: undefined,
    });
  });

  it("calls the chosen Gemini model, and the recommended one when none is chosen", async () => {
    const ok = JSON.stringify({
      candidates: [
        { content: { parts: [{ text: '{"ok":true}' }] }, finishReason: "STOP" },
      ],
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => Promise.resolve(new Response(ok)));
    await testBrowserAiKey("gemini", "k1");
    await testBrowserAiKey("gemini", "k1", "  gemini-custom ");
    const urls = fetchSpy.mock.calls.map(([url]) => String(url as string));
    expect(urls[0]).toContain("/models/gemini-3.8-flash:generateContent");
    expect(urls[1]).toContain("/models/gemini-custom:generateContent");
  });
});

describe("Test key", () => {
  it("says to paste a key first, without calling anyone", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await testBrowserAiKey("groq", "  ")).toEqual({
      isOk: false,
      message: "Paste a key first.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports that a Groq key works, sending the word JSON and no CV data", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            { message: { content: '{"ok":true}' }, finish_reason: "stop" },
          ],
        })
      )
    );
    expect((await testBrowserAiKey("groq", "gk")).isOk).toBe(true);
    const body = String(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body).toMatch(/json/i);
    expect(body).not.toContain("gk");
  });

  it("shows the provider's own error and never the key", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "This model is retired." } }),
        { status: 404 }
      )
    );
    const result = await testBrowserAiKey("gemini", "secret-key-9");
    expect(result.isOk).toBe(false);
    expect(result.message).toMatch(/404/);
    expect(result.message).not.toContain("secret-key-9");
  });
});

describe("Models a key can use", () => {
  it("lists Gemini models that can generate text, without the models/ prefix", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          models: [
            {
              name: "models/gemini-3.8-flash",
              supportedGenerationMethods: ["generateContent"],
            },
            {
              name: "models/embedding-1",
              supportedGenerationMethods: ["embedContent"],
            },
          ],
        })
      )
    );
    expect(await listProviderModels("gemini", "k")).toEqual([
      "gemini-3.8-flash",
    ]);
    const init = fetchSpy.mock.calls[0][1] as {
      headers: Record<string, string>;
    };
    expect(init.headers["x-goog-api-key"]).toBe("k");
  });

  it("lists Groq and Claude models", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ data: [{ id: "m1" }, { id: "m2" }] }))
        )
      );
    expect(await listProviderModels("groq", "k")).toEqual(["m1", "m2"]);
    expect(await listProviderModels("claude", "k")).toEqual(["m1", "m2"]);
    expect(String(fetchSpy.mock.calls[0][0] as string)).toContain(
      "api.groq.com"
    );
    expect(String(fetchSpy.mock.calls[1][0] as string)).toContain(
      "api.anthropic.com"
    );
  });

  it("gives an empty list when the provider refuses, fails or answers oddly", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce(new Response("no", { status: 401 }));
    expect(await listProviderModels("groq", "k")).toEqual([]);
    fetchSpy.mockRejectedValueOnce(new Error("offline"));
    expect(await listProviderModels("gemini", "k")).toEqual([]);
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ x: 1 })));
    expect(await listProviderModels("claude", "k")).toEqual([]);
    expect(await listProviderModels("claude", "")).toEqual([]);
  });
});
