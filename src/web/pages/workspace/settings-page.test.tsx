// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { SettingsPage } from "@pages/workspace/settings-page";
import { AI_PROVIDER_INFO } from "@shared/ai/providers";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const SAME = {
  tailor: "claude",
  import: "claude",
  hide: "claude",
  chat: "claude",
  place: "claude",
};

function status(over: object = {}): object {
  return {
    isConfigured: true,
    provider: "claude",
    providers: [
      { ...AI_PROVIDER_INFO.claude, isConfigured: true },
      { ...AI_PROVIDER_INFO.ollama, isConfigured: true },
    ],
    choice: SAME,
    ...over,
  };
}

function stub(initial: object, put?: () => Response): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string) =>
    Promise.resolve(
      url === "/api/ai/choice" && put
        ? put()
        : new Response(JSON.stringify(initial))
    )
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Settings page", () => {
  it("shows what is sent, the no-guarantee note, the set-up steps and the Ollama install", async () => {
    stub(status());
    render(<SettingsPage />);
    await screen.findByRole("button", { name: "All tasks" });
    expect(
      screen.getByText(/masking is done on a best-effort basis/)
    ).toBeTruthy();
    expect(screen.getByText(/employers → \[Company n\]/)).toBeTruthy();
    expect(screen.getByText("How to set it up")).toBeTruthy();
    expect(screen.getByText(/ollama.com\/download/)).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("All tasks sets every task, and a task card overrides only that task", async () => {
    const fetchMock = stub(
      status(),
      () => new Response(JSON.stringify({ choice: SAME }))
    );
    render(<SettingsPage />);
    await screen.findByRole("button", { name: "All tasks" });
    const all = screen.getByRole("group", { name: "All tasks" });
    fireEvent.click(within(all).getByRole("radio", { name: /Ollama/ }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => u === "/api/ai/choice")).toBe(
        true
      )
    );
    const first = fetchMock.mock.calls.find(([u]) => u === "/api/ai/choice")!;
    expect(JSON.parse(first[1].body)).toEqual({
      tailor: "ollama",
      import: "ollama",
      hide: "ollama",
      chat: "ollama",
      place: "ollama",
    });

    fireEvent.click(screen.getByRole("button", { name: "Chat edits" }));
    const chat = screen.getByRole("group", { name: "Chat edits" });
    fireEvent.click(within(chat).getByRole("radio", { name: /Ollama/ }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([u]) => u === "/api/ai/choice")
      ).toHaveLength(2)
    );
    const second = fetchMock.mock.calls.filter(
      ([u]) => u === "/api/ai/choice"
    )[1];
    expect(JSON.parse(second[1].body)).toEqual({ chat: "ollama" });
  });

  it("marks a task that differs from the others as overridden", async () => {
    stub(status({ choice: { ...SAME, hide: "ollama" } }));
    render(<SettingsPage />);
    const card = await screen.findByRole("button", {
      name: "Pick what to hide",
    });
    expect(within(card).getByText("Overridden")).toBeTruthy();
    expect(
      within(screen.getByRole("button", { name: "All tasks" })).getByText(
        "Mixed"
      )
    ).toBeTruthy();
  });

  it("disables a provider that is not set up and shows the server's refusal", async () => {
    stub(
      status({
        providers: [
          { ...AI_PROVIDER_INFO.claude, isConfigured: false },
          { ...AI_PROVIDER_INFO.ollama, isConfigured: true },
        ],
      }),
      () =>
        new Response(
          JSON.stringify({
            code: "provider_unavailable",
            message: "Ollama is not set up.",
          }),
          { status: 400 }
        )
    );
    render(<SettingsPage />);
    await screen.findByRole("button", { name: "All tasks" });
    const all = screen.getByRole("group", { name: "All tasks" });
    expect(
      within(all).getByRole<HTMLInputElement>("radio", { name: /Claude/ })
        .disabled
    ).toBe(true);
    expect(within(all).getByText("not set up")).toBeTruthy();
    fireEvent.click(within(all).getByRole("radio", { name: /Ollama/ }));
    await screen.findByText("Ollama is not set up.");
  });
});
