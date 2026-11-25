// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { SendToAiHost } from "@pages/workspace/send-to-ai-dialog";
import {
  SendPreviewData,
  gateAiFetch,
  withSendSubject,
} from "@store/persistence/send-gate";

/** Cancels a window left open, so its request ends before the next test starts */
afterEach(() => {
  const cancel = screen.queryByRole("button", { name: "Cancel" });
  if (cancel) {
    act(() => {
      fireEvent.click(cancel);
    });
  }
  cleanup();
});

function previewOf(suggestions: string[]): SendPreviewData {
  return {
    provider: "claude",
    model: "claude-haiku-5-5",
    calls: [{ promptName: "import-cv", system: "s", input: "Alex Morgan" }],
    terms: [],
    suggestions,
  };
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Fake server: the preview lists the suggestions that are not hidden yet */
function server(suggestions: string[]): {
  fetchMock: ReturnType<typeof vi.fn<Fetch>>;
  maskings: { custom: { text: string; kind: string }[] }[];
} {
  const maskings: { custom: { text: string; kind: string }[] }[] = [];
  const fetchMock = vi.fn<Fetch>((_url, init) => {
    const headers = init?.headers as Record<string, string> | undefined;
    const body = JSON.parse(init?.body as string) as {
      masking?: { custom: { text: string; kind: string }[] };
    };
    if (!headers?.["x-ai-preview"]) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true })));
    }
    maskings.push(body.masking ?? { custom: [] });
    const hidden = new Set((body.masking?.custom ?? []).map((m) => m.text));
    return Promise.resolve(
      new Response(
        JSON.stringify(previewOf(suggestions.filter((s) => !hidden.has(s))))
      )
    );
  });
  return { fetchMock, maskings };
}

/** Starts a gated request so the window opens; returns the pending response */
async function openWindow(
  suggestions: string[],
  subject?: string
): Promise<{ maskings: ReturnType<typeof server>["maskings"] }> {
  const { fetchMock, maskings } = server(suggestions);
  render(<SendToAiHost />);
  const send = (): Promise<Response> =>
    gateAiFetch(fetchMock)("/api/ai/import", {
      method: "POST",
      body: JSON.stringify({ text: "Alex Morgan" }),
    });
  void (subject ? withSendSubject(subject, send) : send());
  await screen.findByRole("dialog");
  return { maskings };
}

describe("Send to AI window title", () => {
  it("names the file when the request has a subject", async () => {
    await openWindow([], "“Profile.pdf” (2 of 4)");
    expect(
      await screen.findByText("Send “Profile.pdf” (2 of 4) to Anthropic?")
    ).toBeTruthy();
  });

  it("keeps the plain title for other requests", async () => {
    await openWindow([]);
    expect(await screen.findByText("Send to Anthropic?")).toBeTruthy();
  });
});

describe("Hide all", () => {
  it("is not shown for a single suggestion", async () => {
    await openWindow(["Aachen"]);
    await screen.findByText("Also looks private");
    expect(screen.queryByRole("button", { name: "Hide all" })).toBeNull();
  });

  it("hides every suggestion in one step, with one refreshed preview", async () => {
    const { maskings } = await openWindow(["Aachen", "Tehran", "Iranian"]);
    await screen.findByText("Also looks private");
    const before = maskings.length;
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Hide all" }));
    });
    await vi.waitFor(() => expect(maskings.length).toBe(before + 1));
    expect(maskings.at(-1)?.custom.map((m) => m.text)).toEqual([
      "Aachen",
      "Tehran",
      "Iranian",
    ]);
    expect(maskings.at(-1)?.custom.every((m) => m.kind === "other")).toBe(true);
  });
});
