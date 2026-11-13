import { describe, expect, it, vi } from "vitest";
import {
  FeedbackSendError,
  GithubFeedbackSender,
  readFeedbackSender,
} from "@server/feedback/github-feedback";

const issue = {
  title: "[Bug] Broken",
  body: "Broken",
  labels: ["customer-created", "bug"],
};

function fakeFetch(
  respond: () => Response | Promise<Response>
): ReturnType<typeof vi.fn> {
  return vi.fn(respond);
}

function senderWith(fetchFn: ReturnType<typeof vi.fn>): GithubFeedbackSender {
  return new GithubFeedbackSender(
    "a/b",
    "secret",
    fetchFn as unknown as typeof fetch
  );
}

describe("readFeedbackSender", () => {
  it("is off without a token, or with a blank one", () => {
    expect(readFeedbackSender({}, "a/b")).toBeUndefined();
    expect(
      readFeedbackSender({ FEEDBACK_GITHUB_TOKEN: "  " }, "a/b")
    ).toBeUndefined();
  });

  it("is on with a token", () => {
    expect(
      readFeedbackSender({ FEEDBACK_GITHUB_TOKEN: "t" }, "a/b")
    ).toBeDefined();
  });
});

describe("the GitHub sender", () => {
  it("posts the issue to the repository with the token and returns its number and link", async () => {
    const fetchFn = fakeFetch(
      () =>
        new Response(
          JSON.stringify({ number: 12, html_url: "https://github.com/a/b/12" }),
          { status: 201 }
        )
    );
    expect(await senderWith(fetchFn).create(issue)).toEqual({
      number: 12,
      url: "https://github.com/a/b/12",
    });
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/a/b/issues");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer secret"
    );
    expect(JSON.parse(init.body as string)).toEqual(issue);
  });

  it("fails clearly, without the token, when GitHub refuses", async () => {
    const sender = senderWith(
      fakeFetch(() => new Response("{}", { status: 403 }))
    );
    const error = await sender.create(issue).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FeedbackSendError);
    expect((error as Error).message).toContain("403");
    expect((error as Error).message).not.toContain("secret");
  });

  it("fails clearly when GitHub cannot be reached", async () => {
    const sender = senderWith(
      fakeFetch(() => Promise.reject(new Error("offline")))
    );
    await expect(sender.create(issue)).rejects.toThrow(FeedbackSendError);
  });
});
