// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { BrowserAiKeysPanel } from "@pages/workspace/browser-ai-keys";
import { readBrowserAiKeys } from "@store/persistence/browser/ai/browser-ai";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function card(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

function type(label: RegExp | string, value: string, within_?: HTMLElement) {
  const scope = within_ ? within(within_) : screen;
  fireEvent.change(scope.getByLabelText(label), { target: { value } });
}

const GEMINI_OK = JSON.stringify({
  candidates: [
    { content: { parts: [{ text: '{"ok":true}' }] }, finishReason: "STOP" },
  ],
});

describe("BrowserAiKeysPanel", () => {
  it("shows one card per provider, not set up, with the steps open and a link to the keys page", () => {
    render(<BrowserAiKeysPanel onSaved={() => undefined} />);
    for (const name of [
      "Claude (Anthropic) key",
      "Gemini (Google) key",
      "Groq key",
    ]) {
      expect(within(card(name)).getByText("Not set up")).toBeTruthy();
    }
    const link = within(card("Groq key")).getByRole("link", {
      name: "console.groq.com",
    });
    expect(link.getAttribute("href")).toBe("https://console.groq.com/keys");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("lets the model be typed at any time, with the recommended one as the hint", () => {
    render(<BrowserAiKeysPanel onSaved={() => undefined} />);
    const field = within(
      card("Gemini (Google) key")
    ).getByLabelText<HTMLInputElement>("Model");
    expect(field.disabled).toBe(false);
    expect(field.placeholder).toBe("Recommended: gemini-3.8-flash");
    fireEvent.change(field, { target: { value: "gemini-next" } });
    expect(field.value).toBe("gemini-next");
  });

  it("saves keys and models together", () => {
    const onSaved = vi.fn();
    render(<BrowserAiKeysPanel onSaved={onSaved} />);
    type(/^Groq key$/, "gk", card("Groq key"));
    type("Model", "some/model", card("Groq key"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(readBrowserAiKeys()).toMatchObject({
      groq: "gk",
      groqModel: "some/model",
    });
    expect(onSaved).toHaveBeenCalled();
    expect(screen.getByText("Saved in this browser.")).toBeTruthy();
  });

  it("tests the key with the typed model, shows 'Key works' and offers the models the key can use", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((url) =>
      Promise.resolve(
        String(url as string).includes(":generateContent")
          ? new Response(GEMINI_OK)
          : new Response(
              JSON.stringify({
                models: [
                  {
                    name: "models/gemini-next",
                    supportedGenerationMethods: ["generateContent"],
                  },
                ],
              })
            )
      )
    );
    render(<BrowserAiKeysPanel onSaved={() => undefined} />);
    const gemini = card("Gemini (Google) key");
    type(/^Gemini \(Google\) key$/, "gk", gemini);
    type("Model", "gemini-next", gemini);
    fireEvent.click(within(gemini).getByRole("button", { name: "Test key" }));
    await waitFor(() =>
      expect(within(gemini).getByText("Key works")).toBeTruthy()
    );
    expect(String(fetchSpy.mock.calls[0][0] as string)).toContain(
      "/models/gemini-next:generateContent"
    );
    await waitFor(() =>
      expect(
        document.querySelector("#models-gemini option[value='gemini-next']")
      ).not.toBeNull()
    );
  });

  it("shows the provider's error and keeps the model field editable after a failed test", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "model retired" } }), {
        status: 404,
      })
    );
    render(<BrowserAiKeysPanel onSaved={() => undefined} />);
    const gemini = card("Gemini (Google) key");
    type(/^Gemini \(Google\) key$/, "gk", gemini);
    fireEvent.click(within(gemini).getByRole("button", { name: "Test key" }));
    await waitFor(() =>
      expect(within(gemini).getByText("Test failed")).toBeTruthy()
    );
    expect(within(gemini).getByRole("status").textContent).toMatch(/404/);
    expect(
      within(gemini).getByLabelText<HTMLInputElement>("Model").disabled
    ).toBe(false);
    expect(
      within(gemini).getByRole("button", { name: "Test again" })
    ).toBeTruthy();
  });

  it("drops an old test result as soon as the key changes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(GEMINI_OK));
    render(<BrowserAiKeysPanel onSaved={() => undefined} />);
    const gemini = card("Gemini (Google) key");
    type(/^Gemini \(Google\) key$/, "gk", gemini);
    fireEvent.click(within(gemini).getByRole("button", { name: "Test key" }));
    await waitFor(() =>
      expect(within(gemini).getByText("Key works")).toBeTruthy()
    );
    type(/^Gemini \(Google\) key$/, "gk2", gemini);
    expect(within(gemini).getByText("Not tested")).toBeTruthy();
  });
});
