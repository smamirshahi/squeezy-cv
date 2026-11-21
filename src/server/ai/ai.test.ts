import { afterEach, describe, expect, it, vi } from "vitest";
import { Array, Object, String } from "runtypes";
import { buildServer } from "@server/app";
import { readAiConfig, redact } from "@server/ai/ai-config";
import {
  ClaudeAiClient,
  createAiClient,
  createAnthropicSender,
  extractJson,
} from "@server/ai/claude-client";
import { AiError, MessageSender, SenderResult } from "@server/ai/ai-types";
import { loadPrompt } from "@server/ai/prompts";
import { FileCvStorage } from "@server/storage/file-cv-storage";

const Answer = Object({ keywords: Array(String) });

/** A sender that answers with the given texts in turn, and remembers what it was asked */
function scripted(replies: (string | SenderResult)[]): {
  send: MessageSender;
  calls: { messages: number }[];
} {
  const calls: { messages: number }[] = [];
  let next = 0;
  function send(
    _system: string,
    messages: { role: string; content: string }[]
  ): ReturnType<MessageSender> {
    calls.push({ messages: messages.length });
    const reply = replies[Math.min(next, replies.length - 1)];
    next += 1;
    return Promise.resolve(
      typeof reply === "string"
        ? { text: reply, stopReason: "end_turn" }
        : reply
    );
  }
  return { send, calls };
}

const request = {
  promptName: "json-only",
  input: "Find keywords.",
  schema: Answer,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("extractJson", () => {
  it.each([
    ['{"a":1}', { a: 1 }],
    ['```json\n{"a":1}\n```', { a: 1 }],
    ['Here you go: {"a":{"b":2}} done', { a: { b: 2 } }],
  ])("finds the object in %j", (text, expected) => {
    expect(extractJson(text)).toEqual(expected);
  });

  it("rejects text without an object", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("ClaudeAiClient", () => {
  it("returns valid output", async () => {
    const { send } = scripted(['{"keywords":["react"]}']);
    expect(await new ClaudeAiClient(send).generate(request)).toEqual({
      keywords: ["react"],
    });
  });

  it("rejects malformed output and asks again with the problem", async () => {
    const { send, calls } = scripted([
      "not json at all",
      '{"keywords": 5}',
      '{"keywords":["ok"]}',
    ]);
    const result = await new ClaudeAiClient(send).generate(request);

    expect(result).toEqual({ keywords: ["ok"] });
    // each retry carries the earlier reply and the complaint
    expect(calls.map((c) => c.messages)).toEqual([1, 3, 5]);
  });

  it("stops after the attempt limit and never returns invalid output", async () => {
    const { send, calls } = scripted(['{"keywords": 5}']);
    const error = await new ClaudeAiClient(send)
      .generate({ ...request, maxAttempts: 2 })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).code).toBe("invalid_output");
    expect(calls).toHaveLength(2);
  });

  it("defaults to three attempts", async () => {
    const { send, calls } = scripted(["nope"]);
    await expect(new ClaudeAiClient(send).generate(request)).rejects.toThrow();
    expect(calls).toHaveLength(3);
  });

  it("reports a refusal and a cut-off answer without retrying", async () => {
    for (const [stopReason, code] of [
      ["refusal", "refused"],
      ["max_tokens", "truncated"],
    ] as const) {
      const { send, calls } = scripted([{ text: "{", stopReason }]);
      await expect(
        new ClaudeAiClient(send).generate(request)
      ).rejects.toMatchObject({ code });
      expect(calls).toHaveLength(1);
    }
  });
});

describe("the API key", () => {
  const KEY = "sk-ant-FAKE-secret-key-123";

  it("is removed from text by redact", () => {
    expect(redact(`oops ${KEY} oops`, KEY)).toBe("oops [redacted] oops");
    expect(redact("nothing", undefined)).toBe("nothing");
  });

  it("never appears in an error, even if the service echoes it back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              type: "error",
              error: {
                type: "authentication_error",
                message: `invalid x-api-key: ${KEY}`,
              },
            }),
            { status: 401, headers: { "content-type": "application/json" } }
          )
        )
      )
    );
    const send = createAnthropicSender(
      readAiConfig({ ANTHROPIC_API_KEY: KEY, AI_TIMEOUT_MS: "5000" })
    );
    const error = await send("s", [{ role: "user", content: "hi" }]).catch(
      (e: unknown) => e
    );

    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).code).toBe("api_error");
    expect(JSON.stringify(error)).not.toContain(KEY);
    expect((error as AiError).message).not.toContain(KEY);
    expect((error as AiError).stack).not.toContain(KEY);
  });

  it("is not in the status route, which only says whether one is set", async () => {
    const app = buildServer({
      storage: new FileCvStorage("/nonexistent"),
      ai: new ClaudeAiClient(() => Promise.reject(new Error("unused"))),
    });
    const response = await app.inject({ method: "GET", url: "/api/ai/status" });
    expect(response.json()).toMatchObject({
      isConfigured: true,
      provider: "claude",
    });
    await app.close();
  });
});

describe("configuration", () => {
  it("reads the key, model and timeout, with defaults", () => {
    expect(readAiConfig({})).toMatchObject({
      provider: "claude",
      apiKey: undefined,
      model: "claude-sonnet-5-5",
      timeoutMs: 120000,
    });
    expect(
      readAiConfig({
        ANTHROPIC_API_KEY: " k ",
        ANTHROPIC_MODEL: "m",
        AI_TIMEOUT_MS: "5000",
      })
    ).toMatchObject({ apiKey: "k", model: "m", timeoutMs: 5000 });
    expect(readAiConfig({ ANTHROPIC_API_KEY: "  " }).apiKey).toBeUndefined();
    expect(() => readAiConfig({ AI_TIMEOUT_MS: "-1" })).toThrow(
      /AI_TIMEOUT_MS/
    );
  });

  it("gives a local model much longer than Claude by default, unless told otherwise", () => {
    expect(
      readAiConfig({ AI_PROVIDER: "ollama" }).timeoutMs
    ).toBeGreaterThanOrEqual(600000);
    expect(
      readAiConfig({ AI_PROVIDER: "ollama", AI_TIMEOUT_MS: "5000" }).timeoutMs
    ).toBe(5000);
    expect(readAiConfig({}).timeoutMs).toBe(120000);
  });

  it("refuses to make a client without a key", () => {
    expect(() => createAiClient(readAiConfig({}))).toThrow(AiError);
    expect(() => createAiClient(readAiConfig({}))).toThrow(/ANTHROPIC_API_KEY/);
  });
});

describe("prompts", () => {
  it("loads a prompt from its file", () => {
    expect(loadPrompt("json-only")).toContain("British spelling");
  });

  it("only loads plain names, not paths", () => {
    expect(() => loadPrompt("../ai-config")).toThrow();
    expect(() => loadPrompt("a/b")).toThrow();
  });
});

describe("personal data never reaches the model", () => {
  const personal = {
    profile: {
      fullName: "Mohammad Amirshahi",
      email: "mo@example.com",
      phone: "07700 900123",
    },
    links: [],
  };
  const schema = { check: (v: unknown) => v as { greeting: string } };

  it("sends placeholders only, in every attempt, and restores the answer", async () => {
    const sent: string[] = [];
    let call = 0;
    const send: MessageSender = (system, messages) => {
      sent.push(system, ...messages.map((m) => m.content));
      call += 1;
      return Promise.resolve({
        text:
          call === 1
            ? "not json for Mohammad Amirshahi"
            : '{"greeting":"Dear [Candidate Name], write to [Email]"}',
        stopReason: "end_turn",
      });
    };
    const result = await new ClaudeAiClient(send).generate({
      promptName: "json-only",
      input: "Mohammad Amirshahi, mo@example.com, 07700900123",
      schema,
      personal,
    });
    expect(result.greeting).toBe(
      "Dear Mohammad Amirshahi, write to mo@example.com"
    );
    expect(call).toBe(2);
    const body = sent.join("\n");
    for (const secret of [
      "Mohammad",
      "Amirshahi",
      "mo@example.com",
      "900123",
    ]) {
      expect(body).not.toContain(secret);
    }
  });

  it("warns, and does not fail, when the model invents a placeholder", async () => {
    const warnings: string[] = [];
    const send: MessageSender = () =>
      Promise.resolve({
        text: '{"greeting":"Hi [Candidate Name] [Phone Numbr]"}',
        stopReason: "end_turn",
      });
    const result = await new ClaudeAiClient(send).generate({
      promptName: "json-only",
      input: "x",
      schema,
      personal,
      onWarning: (m) => warnings.push(m),
    });
    expect(result.greeting).toBe("Hi Mohammad Amirshahi [Phone Numbr]");
    expect(warnings).toHaveLength(1);
  });

  it("with employer and school masking, sends [Company n] and [Institution n], restores them, and warns about a changed one", async () => {
    const orgs = {
      ...personal,
      organisations: {
        companies: ["Example Ltd"],
        schools: ["Leeds University"],
      },
    };
    const sent: string[] = [];
    const warnings: string[] = [];
    const send: MessageSender = (system, messages) => {
      sent.push(system, ...messages.map((m) => m.content));
      return Promise.resolve({
        text: '{"greeting":"Ten years at [Company 1] and [Institution 1], not [Company 3]"}',
        stopReason: "end_turn",
      });
    };
    const result = await new ClaudeAiClient(send).generate({
      promptName: "json-only",
      input: "Example Ltd and Leeds University",
      schema,
      personal: orgs,
      onWarning: (m) => warnings.push(m),
    });
    expect(sent.join("\n")).not.toMatch(/Example|Leeds/);
    expect(sent.join("\n")).toContain("[Company 1] and [Institution 1]");
    expect(result.greeting).toBe(
      "Ten years at Example Ltd and Leeds University, not [Company 3]"
    );
    expect(warnings).toEqual([expect.stringContaining("[Company 3]")]);
  });
});
