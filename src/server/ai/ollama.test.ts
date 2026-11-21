import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { Array, Object, String } from "runtypes";
import { buildServer } from "@server/app";
import { readAiConfig } from "@server/ai/ai-config";
import { createConfiguredAi, isAiAvailable } from "@server/ai/ai-provider";
import { AiError } from "@server/ai/ai-types";
import { createOllamaSender } from "@server/ai/ollama-client";
import { FileCvStorage } from "@server/storage/file-cv-storage";

interface Seen {
  url: string;
  body: Record<string, unknown>;
}

let server: http.Server | undefined;

/** A fake Ollama: answers every request with `respond`, and remembers what it was sent */
async function startFake(
  respond: (seen: Seen, res: http.ServerResponse) => void
): Promise<{ url: string; requests: Seen[] }> {
  const requests: Seen[] = [];
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
      const seen = { url: req.url ?? "", body: JSON.parse(raw || "{}") };
      requests.push(seen);
      respond(seen, res);
    });
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    requests,
  };
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function config(
  url: string,
  over: Record<string, string> = {}
): ReturnType<typeof readAiConfig> {
  return readAiConfig({
    AI_PROVIDER: "ollama",
    OLLAMA_URL: url,
    OLLAMA_MODEL: "test-model",
    ...over,
  });
}

afterEach(async () => {
  await new Promise<void>((resolve) => {
    if (server) {
      server.closeAllConnections();
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
  server = undefined;
});

const Answer = Object({ keywords: Array(String) });
const request = {
  promptName: "json-only",
  input: "Find keywords.",
  schema: Answer,
};

describe("the Ollama sender", () => {
  it("asks for JSON, a big enough context and the system prompt", async () => {
    const fake = await startFake((_seen, res) =>
      json(res, 200, {
        message: { content: '{"keywords":["a"]}' },
        done_reason: "stop",
      })
    );
    const send = createOllamaSender(
      config(fake.url, { OLLAMA_NUM_CTX: "8192" })
    );
    const result = await send("SYSTEM PROMPT", [
      { role: "user", content: "hello" },
    ]);

    expect(result).toEqual({
      text: '{"keywords":["a"]}',
      stopReason: "end_turn",
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    const [seen] = fake.requests;
    expect(seen.url).toBe("/api/chat");
    expect(seen.body).toMatchObject({
      model: "test-model",
      stream: false,
      format: "json",
      options: { num_ctx: 8192 },
      messages: [
        { role: "system", content: "SYSTEM PROMPT" },
        { role: "user", content: "hello" },
      ],
    });
  });

  it("defaults to a context window big enough for a CV", () => {
    expect(readAiConfig({}).ollama.numCtx).toBeGreaterThanOrEqual(16000);
  });

  it("explains when Ollama is not running", async () => {
    const fake = await startFake(() => undefined);
    const url = fake.url;
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    const error = await createOllamaSender(config(url))("s", [
      { role: "user", content: "x" },
    ]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).code).toBe("api_error");
    expect((error as AiError).message).toContain("ollama serve");
  });

  it("explains when the model has not been pulled", async () => {
    const fake = await startFake((_seen, res) =>
      json(res, 404, { error: 'model "test-model" not found' })
    );
    const error = await createOllamaSender(config(fake.url))("s", [
      { role: "user", content: "x" },
    ]).catch((e: unknown) => e);
    expect((error as AiError).message).toContain("ollama pull test-model");
  });

  it("reports other errors from Ollama", async () => {
    const fake = await startFake((_seen, res) =>
      json(res, 500, { error: "out of memory" })
    );
    const error = await createOllamaSender(config(fake.url))("s", [
      { role: "user", content: "x" },
    ]).catch((e: unknown) => e);
    expect((error as AiError).message).toContain("out of memory");
  });

  it("times out when the model takes too long", async () => {
    // this fake never answers
    const fake = await startFake(() => undefined);
    const error = await createOllamaSender(
      config(fake.url, { AI_TIMEOUT_MS: "100" })
    )("s", [{ role: "user", content: "x" }]).catch((e: unknown) => e);
    expect((error as AiError).code).toBe("timeout");
  });

  it("treats an answer cut off at the length limit as such", async () => {
    const fake = await startFake((_seen, res) =>
      json(res, 200, { message: { content: '{"key' }, done_reason: "length" })
    );
    const result = await createOllamaSender(config(fake.url))("s", [
      { role: "user", content: "x" },
    ]);
    expect(result.stopReason).toBe("max_tokens");
  });
});

describe("the same checking and retrying as with Claude", () => {
  it("returns valid JSON from the local model", async () => {
    const fake = await startFake((_seen, res) =>
      json(res, 200, {
        message: { content: '```json\n{"keywords":["react"]}\n```' },
        done_reason: "stop",
      })
    );
    const ai = createConfiguredAi(config(fake.url))!;
    expect(await ai.generate(request)).toEqual({ keywords: ["react"] });
  });

  it("rejects a bad answer, asks again, and gives up after the limit", async () => {
    let calls = 0;
    const fake = await startFake((_seen, res) => {
      calls += 1;
      json(res, 200, {
        message: {
          content: calls < 2 ? "sorry, no json" : '{"keywords":["ok"]}',
        },
        done_reason: "stop",
      });
    });
    const ai = createConfiguredAi(config(fake.url))!;
    expect(await ai.generate(request)).toEqual({ keywords: ["ok"] });
    expect(calls).toBe(2);

    // from now on the answer is never valid
    calls = -100;
    await expect(
      ai.generate({ ...request, maxAttempts: 2 })
    ).rejects.toMatchObject({ code: "invalid_output" });
  });
});

describe("choosing the provider", () => {
  it("defaults to Claude, and only accepts the two known providers", () => {
    expect(readAiConfig({}).provider).toBe("claude");
    expect(readAiConfig({ AI_PROVIDER: " Ollama " }).provider).toBe("ollama");
    expect(() => readAiConfig({ AI_PROVIDER: "openai" })).toThrow(
      /AI_PROVIDER/
    );
  });

  it("Claude needs a key; Ollama needs none", () => {
    expect(isAiAvailable(readAiConfig({}))).toBe(false);
    expect(createConfiguredAi(readAiConfig({}))).toBeUndefined();
    expect(isAiAvailable(readAiConfig({ ANTHROPIC_API_KEY: "k" }))).toBe(true);
    expect(
      createConfiguredAi(readAiConfig({ ANTHROPIC_API_KEY: "k" }))
    ).toBeDefined();
    expect(
      createConfiguredAi(readAiConfig({ AI_PROVIDER: "ollama" }))
    ).toBeDefined();
  });

  it("keeps the CV on this machine: only a local OLLAMA_URL is accepted", () => {
    expect(
      readAiConfig({ OLLAMA_URL: "http://localhost:11434/" }).ollama.url
    ).toBe("http://localhost:11434");
    for (const bad of [
      "https://api.example.com",
      "http://192.168.1.20:11434",
      "http://127.0.0.1.evil.com",
      "nonsense",
    ]) {
      expect(() => readAiConfig({ OLLAMA_URL: bad })).toThrow(/OLLAMA_URL/);
    }
  });

  it("says which provider the server uses", async () => {
    const app = buildServer({
      storage: new FileCvStorage("/nonexistent"),
      ai: createConfiguredAi(readAiConfig({ AI_PROVIDER: "ollama" })),
      aiProvider: "ollama",
    });
    const response = await app.inject({ method: "GET", url: "/api/ai/status" });
    expect(response.json()).toMatchObject({
      isConfigured: true,
      provider: "ollama",
    });
    await app.close();
  });
});
