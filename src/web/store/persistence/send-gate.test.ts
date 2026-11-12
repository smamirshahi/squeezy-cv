// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { gateAiFetch, registerSendHost } from "@store/persistence/send-gate";

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
