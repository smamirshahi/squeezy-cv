// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  gateAiFetch,
  registerSendHost,
  withOneApproval,
  withSendSubject,
} from "@store/persistence/send-gate";

let unregister: (() => void) | undefined;
afterEach(() => {
  unregister?.();
  unregister = undefined;
});

const preview = {
  provider: "claude",
  calls: [{ promptName: "ats-wording", system: "s", input: "i" }],
  terms: [],
  suggestions: [],
};

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

function server(): ReturnType<typeof vi.fn<Fetch>> {
  return vi.fn<Fetch>((_url, init) => {
    const headers = init?.headers as Record<string, string> | undefined;
    return Promise.resolve(
      new Response(
        JSON.stringify(
          headers?.["x-ai-preview"] ? preview : { suggestions: [] }
        )
      )
    );
  });
}

function post(body: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(body) };
}

describe("the Send to AI step for Suggest natural wording", () => {
  it("shows what would be sent and only asks the model after approval", async () => {
    const fetchMock = server();
    const host = vi
      .fn()
      .mockResolvedValue({ masking: { custom: [], skip: [] } });
    unregister = registerSendHost(host);
    const response = await gateAiFetch(fetchMock)(
      "/api/ai/ats-wording",
      post({ terms: ["React.js"] })
    );
    expect(response.ok).toBe(true);
    expect(host).toHaveBeenCalledTimes(1);
    expect(host.mock.calls[0][0]).toMatchObject({
      scope: "Your summary and descriptions, and the advert's keywords",
      hasAdvert: false,
      preview: { provider: "claude" },
    });
    const kinds = fetchMock.mock.calls.map(
      ([, init]) =>
        (init?.headers as Record<string, string> | undefined)?.[
          "x-ai-preview"
        ] ?? "real"
    );
    // first the preview, then the real request
    expect(kinds).toEqual(["1", "real"]);
  });

  it("sends nothing when the user cancels", async () => {
    const fetchMock = server();
    unregister = registerSendHost(() => Promise.resolve(null));
    const response = await gateAiFetch(fetchMock)(
      "/api/ai/ats-wording",
      post({ terms: ["React.js"] })
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("cancelled");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("naming what a request is about", () => {
  const approve = { masking: { custom: [], skip: [] } };

  it("passes the name given by withSendSubject to the window", async () => {
    const host = vi.fn().mockResolvedValue(approve);
    unregister = registerSendHost(host);
    await withSendSubject("“Profile.pdf” (2 of 4)", () =>
      gateAiFetch(server())("/api/ai/import", post({ text: "x" }))
    );
    expect(host.mock.calls[0][0].subject).toBe("“Profile.pdf” (2 of 4)");
  });

  it("has no name for a request made outside withSendSubject", async () => {
    const host = vi.fn().mockResolvedValue(approve);
    unregister = registerSendHost(host);
    await gateAiFetch(server())("/api/ai/import", post({ text: "x" }));
    expect(host.mock.calls[0][0].subject).toBeUndefined();
  });

  it("forgets the name afterwards, also when the request failed", async () => {
    const host = vi.fn().mockResolvedValue(approve);
    unregister = registerSendHost(host);
    await expect(
      withSendSubject("“a.pdf”", () => Promise.reject(new Error("boom")))
    ).rejects.toThrow("boom");
    await gateAiFetch(server())("/api/ai/import", post({ text: "x" }));
    expect(host.mock.calls[0][0].subject).toBeUndefined();
  });

  it("returns the cancel answer when the user says no, so the caller can keep its other results", async () => {
    unregister = registerSendHost(() => Promise.resolve(null));
    const response = await withSendSubject("“a.pdf”", () =>
      gateAiFetch(server())("/api/ai/import", post({ text: "x" }))
    );
    expect(response.status).toBe(409);
  });

  it("asks once for a batch, names it, and reuses the approval for every request", async () => {
    const fetchMock = server();
    const host = vi.fn().mockResolvedValue(approve);
    unregister = registerSendHost(host);
    const gated = gateAiFetch(fetchMock);
    const entries = [
      { url: "/api/ai/import", body: { text: "one" } },
      { url: "/api/ai/import", body: { text: "two" } },
    ];
    await withSendSubject("2 files", () =>
      withOneApproval(entries, async () => {
        await gated("/api/ai/import", post({ text: "one" }));
        await gated("/api/ai/import", post({ text: "two" }));
      })
    );
    expect(host).toHaveBeenCalledTimes(1);
    expect(host.mock.calls[0][0].subject).toBe("2 files");
    // The window shows both messages
    expect(host.mock.calls[0][0].preview.calls).toHaveLength(2);
    const real = fetchMock.mock.calls.filter(
      ([, init]) =>
        !(init?.headers as Record<string, string> | undefined)?.["x-ai-preview"]
    );
    expect(real).toHaveLength(2);
  });
});
