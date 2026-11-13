// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { UnsortedPlacement } from "@pages/workspace/unsorted-placement";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { OPEN_AI_SETTINGS_EVENT } from "@pages/workspace/ai-settings-event";
import {
  addItem,
  ensureUnsortedSection,
  resetVaultState,
} from "@store/vault/vault-slice";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(
  answer: unknown,
  status: unknown = { isConfigured: true, provider: "ollama" },
  itemCount = 1
): {
  store: AppStore;
  fetchMock: ReturnType<typeof vi.fn>;
} {
  const fetchMock = vi.fn((url: string) =>
    Promise.resolve(
      new Response(JSON.stringify(url === "/api/ai/status" ? status : answer))
    )
  );
  vi.stubGlobal("fetch", fetchMock);
  const store: AppStore = configureStore({ reducer: rootReducer });
  store.dispatch(resetVaultState());
  store.dispatch(ensureUnsortedSection());
  if (itemCount > 0) {
    store.dispatch(
      addItem({ sectionId: "unsorted", id: "x", fields: { title: "AWS cert" } })
    );
  }
  const section = store
    .getState()
    .vault.sections.find((s) => s.id === "unsorted")!;
  render(
    <Provider store={store}>
      <UnsortedPlacement section={section} />
    </Provider>
  );
  return { store, fetchMock };
}

describe("UnsortedPlacement", () => {
  it("moves an item only after the user accepts the suggestion", async () => {
    const { store, fetchMock } = setup({
      suggestions: [
        { itemId: "x", sectionId: "experience", reason: "Looks like work" },
      ],
      warnings: [],
    });
    const ask = await screen.findByRole("button", {
      name: "Ask AI where these belong",
    });
    fireEvent.click(ask);
    await screen.findByText(/Looks like work/);
    const body = JSON.parse(
      (
        fetchMock.mock.calls.find((c) => c[0] === "/api/ai/place")![1] as {
          body: string;
        }
      ).body
    );
    expect(body.items[0].itemId).toBe("x");
    expect(body.sections.map((s: { type: string }) => s.type)).not.toContain(
      "unsorted"
    );
    const unsortedItems = (): number =>
      store.getState().vault.sections.find((s) => s.id === "unsorted")!.items
        .length;
    expect(unsortedItems()).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: /^Move AWS cert to/ }));
    await waitFor(() => expect(unsortedItems()).toBe(0));
    expect(
      store.getState().vault.sections.find((s) => s.id === "experience")!.items
    ).toHaveLength(1);
  });

  it("ignores a suggestion for an unknown section", async () => {
    setup({
      suggestions: [{ itemId: "x", sectionId: "gone", reason: "" }],
      warnings: [],
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Ask AI where these belong" })
    );
    await screen.findByText("Nothing usable. Move items by hand.");
  });

  it("shows the AI card with the chosen provider", async () => {
    setup({}, { isConfigured: true, provider: "ollama" });
    const card = screen.getByRole("region", {
      name: "Ask AI where these belong",
    });
    await waitFor(() =>
      expect(card.textContent).toMatch(/Ollama · on this computer/)
    );
    expect(card.textContent).toMatch(/local model only/);
  });

  it("works with an online provider and says where the text goes", async () => {
    setup(
      {},
      {
        isConfigured: true,
        provider: "claude",
        choice: { place: "gemini" },
        providers: [{ id: "gemini", isConfigured: true }],
      }
    );
    const card = screen.getByRole("region", {
      name: "Ask AI where these belong",
    });
    await waitFor(() => expect(card.textContent).toMatch(/Gemini · online/));
    expect(card.textContent).toMatch(/not your name or contact details/);
  });

  it("opens the AI settings on the place task with Change AI", () => {
    setup({});
    const heard = vi.fn();
    window.addEventListener(OPEN_AI_SETTINGS_EVENT, heard);
    fireEvent.click(screen.getByRole("button", { name: "Change AI" }));
    window.removeEventListener(OPEN_AI_SETTINGS_EVENT, heard);
    expect(
      (heard.mock.calls[0][0] as CustomEvent<{ task?: string }>).detail.task
    ).toBe("place");
  });

  it("keeps the button visible but disabled when the AI is not set up", async () => {
    setup(
      {},
      {
        isConfigured: false,
        provider: "gemini",
        providers: [{ id: "gemini", isConfigured: false }],
      }
    );
    const ask = screen.getByRole("button", {
      name: "Ask AI where these belong",
    });
    await waitFor(() => expect(ask.hasAttribute("disabled")).toBe(true));
  });

  it("disables the button when there is nothing to place", async () => {
    setup({}, { isConfigured: true, provider: "ollama" }, 0);
    const ask = screen.getByRole("button", {
      name: "Ask AI where these belong",
    });
    await screen.findByText(/Ollama · on this computer/);
    expect(ask.hasAttribute("disabled")).toBe(true);
  });
});
