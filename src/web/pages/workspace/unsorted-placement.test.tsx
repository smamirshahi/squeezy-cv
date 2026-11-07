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
import {
  addItem,
  ensureUnsortedSection,
  resetVaultState,
} from "@store/vault/vault-slice";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(answer: unknown): {
  store: AppStore;
  fetchMock: ReturnType<typeof vi.fn>;
} {
  const fetchMock = vi.fn((url: string) =>
    Promise.resolve(
      new Response(
        JSON.stringify(
          url === "/api/ai/status"
            ? { isConfigured: true, provider: "ollama" }
            : answer
        )
      )
    )
  );
  vi.stubGlobal("fetch", fetchMock);
  const store: AppStore = configureStore({ reducer: rootReducer });
  store.dispatch(resetVaultState());
  store.dispatch(ensureUnsortedSection());
  store.dispatch(
    addItem({ sectionId: "unsorted", id: "x", fields: { title: "AWS cert" } })
  );
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
});
