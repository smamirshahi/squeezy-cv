import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { Array, Object, String } from "runtypes";
import sample from "@fixtures/sample-cv.json";
import { readAiConfig } from "@server/ai/ai-config";
import {
  createAiClients,
  createConfiguredAi,
  isAiAvailable,
} from "@server/ai/ai-provider";
import { AiError } from "@server/ai/ai-types";
import { analyseJobAd } from "@server/ai/analyse-job-ad";
import { migrateCvFile } from "@shared/vault/migrate-vault";

interface Seen {
  url: string;
  headers: http.IncomingHttpHeaders;
  raw: string;
  body: Record<string, unknown>;
}

let server: http.Server | undefined;

/** A fake Gemini/Groq: answers each request with `respond(seen, count)` and remembers what it was sent */
async function startFake(
  respond: (seen: Seen, count: number, res: http.ServerResponse) => void
): Promise<{ url: string; requests: Seen[] }> {
  const requests: Seen[] = [];
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
      const seen = {
        url: req.url ?? "",
        headers: req.headers,
        raw,
        body: JSON.parse(raw || "{}"),
      };
      requests.push(seen);
      respond(seen, requests.length, res);
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

const KEY = "sk-secret-KEY-12345";
const Answer = Object({ keywords: Array(String) });
const ask = {
  promptName: "json-only",
  input: "Find keywords.",
  schema: Answer,
};

const gemini = (text: string, finishReason = "STOP"): object => ({
  candidates: [{ content: { parts: [{ text }] }, finishReason }],
});
const groq = (text: string, finish = "stop"): object => ({
  choices: [{ message: { content: text }, finish_reason: finish }],
});

function geminiConfig(
  url: string,
  env: Record<string, string> = {}
): ReturnType<typeof readAiConfig> {
  return readAiConfig({
    AI_PROVIDER: "gemini",
    GEMINI_API_KEY: KEY,
    GEMINI_BASE_URL: url,
    GEMINI_MODEL: "gm",
    ...env,
  });
}
function groqConfig(
  url: string,
  env: Record<string, string> = {}
): ReturnType<typeof readAiConfig> {
  return readAiConfig({
    AI_PROVIDER: "groq",
    GROQ_API_KEY: KEY,
    GROQ_BASE_URL: url,
    GROQ_MODEL: "gq",
    ...env,
  });
}

describe("provider selection and keys", () => {
  it("reads gemini and groq, with defaults for the model", () => {
    expect(readAiConfig({ AI_PROVIDER: " Gemini " }).provider).toBe("gemini");
    expect(readAiConfig({ AI_PROVIDER: "groq" }).provider).toBe("groq");
    expect(readAiConfig({}).gemini.model).toMatch(/^gemini/);
    expect(readAiConfig({}).groq.baseUrl).toBe("https://api.groq.com/openai");
    expect(() => readAiConfig({ AI_PROVIDER: "openai" })).toThrow(
      /AI_PROVIDER/
    );
  });

  it("needs a key: without one the provider is not available", () => {
    expect(isAiAvailable(readAiConfig({ AI_PROVIDER: "gemini" }))).toBe(false);
    expect(
      createConfiguredAi(readAiConfig({ AI_PROVIDER: "groq" }))
    ).toBeUndefined();
    expect(
      isAiAvailable(
        readAiConfig({ AI_PROVIDER: "gemini", GEMINI_API_KEY: "k" })
      )
    ).toBe(true);
    // a Gemini key does not make Groq available
    const clients = createAiClients(readAiConfig({ GEMINI_API_KEY: "k" }));
    expect(Reflect.ownKeys(clients).sort()).toEqual(["gemini", "ollama"]);
  });

  it("only accepts another address over https or on this machine", () => {
    expect(() =>
      readAiConfig({ GEMINI_BASE_URL: "http://example.com" })
    ).toThrow(/https/);
    expect(() =>
      readAiConfig({ GROQ_BASE_URL: "http://127.0.0.1:9" })
    ).not.toThrow();
    expect(() => readAiConfig({ GROQ_BASE_URL: "nonsense" })).toThrow(
      /full address/
    );
  });
});

describe("Gemini", () => {
  it("sends the key in a header, the prompt as a system instruction and asks for JSON", async () => {
    const fake = await startFake((_seen, _count, res) =>
      json(res, 200, gemini('{"keywords":["a"]}'))
    );
    const ai = createConfiguredAi(geminiConfig(fake.url))!;
    expect(await ai.generate(ask)).toEqual({ keywords: ["a"] });
    const seen = fake.requests[0];
    expect(seen.url).toBe("/v1beta/models/gm:generateContent");
    expect(seen.headers["x-goog-api-key"]).toBe(KEY);
    expect(seen.url).not.toContain(KEY);
    expect(JSON.stringify(seen.body.systemInstruction)).toContain("JSON");
    expect(JSON.stringify(seen.body.contents)).toContain("Find keywords.");
    expect(
      (seen.body.generationConfig as { responseMimeType: string })
        .responseMimeType
    ).toBe("application/json");
  });

  it("tells the model what was wrong and asks again (role 'model' for its earlier answer)", async () => {
    const fake = await startFake((_seen, count, res) =>
      json(
        res,
        200,
        gemini(count === 1 ? '{"wrong":1}' : '{"keywords":["ok"]}')
      )
    );
    const ai = createConfiguredAi(geminiConfig(fake.url))!;
    expect(await ai.generate(ask)).toEqual({ keywords: ["ok"] });
    const roles = (fake.requests[1].body.contents as { role: string }[]).map(
      (c) => c.role
    );
    expect(roles).toEqual(["user", "model", "user"]);
  });

  it("maps a cut-off answer and a safety block to their error codes", async () => {
    const cut = await startFake((_s, _c, res) =>
      json(res, 200, gemini('{"keywords":', "MAX_TOKENS"))
    );
    await expect(
      createConfiguredAi(geminiConfig(cut.url))!.generate(ask)
    ).rejects.toMatchObject({ code: "truncated" });
    const blocked = await startFake((_s, _c, res) =>
      json(res, 200, { promptFeedback: { blockReason: "SAFETY" } })
    );
    await expect(
      createConfiguredAi(geminiConfig(blocked.url))!.generate(ask)
    ).rejects.toMatchObject({ code: "refused" });
  });
});

describe("Groq", () => {
  it("sends the key as a bearer token, the prompt as a system message and asks for JSON", async () => {
    const fake = await startFake((_s, _c, res) =>
      json(res, 200, groq('{"keywords":["g"]}'))
    );
    const ai = createConfiguredAi(groqConfig(fake.url))!;
    expect(await ai.generate(ask)).toEqual({ keywords: ["g"] });
    const seen = fake.requests[0];
    expect(seen.url).toBe("/v1/chat/completions");
    expect(seen.headers.authorization).toBe(`Bearer ${KEY}`);
    const messages = seen.body.messages as { role: string; content: string }[];
    expect(messages[0].role).toBe("system");
    expect(messages.at(-1)?.content).toBe("Find keywords.");
    expect(seen.body.response_format).toEqual({ type: "json_object" });
    expect(seen.body.model).toBe("gq");
  });

  it("maps finish reasons", async () => {
    const cut = await startFake((_s, _c, res) =>
      json(res, 200, groq("{", "length"))
    );
    await expect(
      createConfiguredAi(groqConfig(cut.url))!.generate(ask)
    ).rejects.toMatchObject({ code: "truncated" });
    const filtered = await startFake((_s, _c, res) =>
      json(res, 200, groq("", "content_filter"))
    );
    await expect(
      createConfiguredAi(groqConfig(filtered.url))!.generate(ask)
    ).rejects.toMatchObject({ code: "refused" });
  });
});

describe.each([
  ["Gemini", geminiConfig],
  ["Groq", groqConfig],
])("%s errors", (name, makeConfig) => {
  it("maps HTTP errors to api_error with a readable reason", async () => {
    for (const [status, text] of [
      [429, "free limit"],
      [401, "key was refused"],
      [500, "status 500"],
    ] as const) {
      const fake = await startFake((_s, _c, res) =>
        json(res, status, { error: { message: "nope" } })
      );
      const error = await createConfiguredAi(makeConfig(fake.url))!
        .generate(ask)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AiError);
      expect((error as AiError).code).toBe("api_error");
      expect((error as AiError).message).toContain(name);
      expect((error as AiError).message).toContain(text);
      await new Promise<void>((resolve) => {
        server!.closeAllConnections();
        server!.close(() => resolve());
      });
      server = undefined;
    }
  });

  it("never puts the key in an error, even when the service echoes it", async () => {
    const fake = await startFake((_s, _c, res) =>
      json(res, 400, { error: { message: `Invalid key ${KEY} supplied` } })
    );
    const error = (await createConfiguredAi(makeConfig(fake.url))!
      .generate(ask)
      .catch((e: unknown) => e)) as AiError;
    expect(error.message).not.toContain(KEY);
    expect(error.message).toContain("[redacted]");
  });

  it("says so when the service cannot be reached, without the key", async () => {
    const error = (await createConfiguredAi(makeConfig("http://127.0.0.1:1"))!
      .generate(ask)
      .catch((e: unknown) => e)) as AiError;
    expect(error.code).toBe("api_error");
    expect(error.message).toContain("could not be reached");
    expect(error.message).not.toContain(KEY);
  });

  it("times out", async () => {
    const fake = await startFake(() => undefined);
    const error = (await createConfiguredAi(
      makeConfig(fake.url, { AI_TIMEOUT_MS: "100" })
    )!
      .generate(ask)
      .catch((e: unknown) => e)) as AiError;
    expect(error.code).toBe("timeout");
  });
});

describe("what leaves the machine", () => {
  const file = migrateCvFile(sample);
  const { profile, links } = file.vault;

  const answers = (): unknown => ({
    jobTitle: "Dev",
    seniority: "",
    mustHave: [],
    niceToHave: [],
    keywords: [],
  });

  it.each([
    ["Gemini", geminiConfig, (text: unknown) => gemini(JSON.stringify(text))],
    ["Groq", groqConfig, (text: unknown) => groq(JSON.stringify(text))],
  ])(
    "%s: nothing from the profile is in the request body",
    async (_name, makeConfig, wrap) => {
      const fake = await startFake((_s, _count, res) =>
        json(res, 200, wrap(answers()))
      );
      const ai = createConfiguredAi(makeConfig(fake.url))!;
      const advert = `Hiring a developer. Contact ${profile.fullName} at ${profile.email}.`;
      await analyseJobAd(ai, file.vault, advert);
      expect(fake.requests).toHaveLength(1);
      const sent = fake.requests.map((r) => r.raw).join("\n");
      for (const secret of [
        profile.fullName,
        profile.email,
        profile.phone,
        ...links.map((l) => l.url),
      ]) {
        if (secret) {
          expect(sent).not.toContain(secret);
        }
      }
      // the advert's mention of the person was masked too
      expect(sent).toContain("[Candidate Name]");
      expect(sent).toContain("[Email]");
    }
  );
});
