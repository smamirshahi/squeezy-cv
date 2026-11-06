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
import { AiSetup } from "@pages/workspace/ai-setup";
import { AI_PROVIDER_INFO } from "@shared/ai/providers";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function status(over: object = {}): object {
  return {
    isConfigured: true,
    provider: "claude",
    providers: [
      { ...AI_PROVIDER_INFO.claude, isConfigured: true },
      { ...AI_PROVIDER_INFO.ollama, isConfigured: true },
    ],
    choice: { tailor: "claude", import: "claude", hide: "claude" },
    ...over,
  };
}

function stub(
  initial: object,
  put?: (body: object) => Response
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/ai/choice") {
      return Promise.resolve(
        put?.(JSON.parse(init?.body as string)) ?? new Response("{}")
      );
    }
    return Promise.resolve(new Response(JSON.stringify(initial)));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("AI setup chooser", () => {
  it("shows a group per task with online and offline providers and where the text goes", async () => {
    stub(status());
    render(<AiSetup />);
    const tailor = await screen.findByRole("group", {
      name: "Tailor to a job ad",
    });
    expect(within(tailor).getByRole("radio", { name: /Claude/ })).toBeTruthy();
    expect(within(tailor).getByText("online")).toBeTruthy();
    expect(within(tailor).getByText("offline")).toBeTruthy();
    expect(
      within(tailor).getByText(/Masked text goes to Anthropic/)
    ).toBeTruthy();
    const importGroup = screen.getByRole("group", {
      name: "Sort pasted CV text",
    });
    expect(
      within(importGroup).getByText(
        /including your name and contact details, goes to Anthropic/
      )
    ).toBeTruthy();
  });

  it("changing one task sends only that task, and the notice follows the choice", async () => {
    const fetchMock = stub(
      status(),
      () =>
        new Response(
          JSON.stringify({
            choice: { tailor: "claude", import: "ollama", hide: "claude" },
          })
        )
    );
    render(<AiSetup />);
    const group = await screen.findByRole("group", {
      name: "Sort pasted CV text",
    });
    fireEvent.click(within(group).getByRole("radio", { name: /Ollama/ }));
    await waitFor(() =>
      expect(
        within(group).getByText("Nothing leaves this computer.")
      ).toBeTruthy()
    );
    const call = fetchMock.mock.calls.find(
      ([url]) => url === "/api/ai/choice"
    )!;
    expect(call[1].method).toBe("PUT");
    expect(JSON.parse(call[1].body)).toEqual({ import: "ollama" });
  });

  it("disables a provider that is not set up and says so", async () => {
    stub(
      status({
        providers: [
          { ...AI_PROVIDER_INFO.claude, isConfigured: false },
          { ...AI_PROVIDER_INFO.ollama, isConfigured: true },
        ],
        provider: "ollama",
        choice: { tailor: "ollama", import: "ollama", hide: "ollama" },
      })
    );
    render(<AiSetup />);
    const group = await screen.findByRole("group", {
      name: "Tailor to a job ad",
    });
    expect(
      within(group).getByRole<HTMLInputElement>("radio", { name: /Claude/ })
        .disabled
    ).toBe(true);
    expect(within(group).getByText("not set up")).toBeTruthy();
  });

  it("shows the server's refusal and keeps the old choice", async () => {
    stub(
      status(),
      () =>
        new Response(
          JSON.stringify({
            code: "provider_unavailable",
            message: "Ollama is not set up.",
          }),
          { status: 400 }
        )
    );
    render(<AiSetup />);
    const group = await screen.findByRole("group", {
      name: "Tailor to a job ad",
    });
    fireEvent.click(within(group).getByRole("radio", { name: /Ollama/ }));
    await screen.findByText("Ollama is not set up.");
    expect(
      within(group).getByRole<HTMLInputElement>("radio", { name: /Claude/ })
        .checked
    ).toBe(true);
  });
});
