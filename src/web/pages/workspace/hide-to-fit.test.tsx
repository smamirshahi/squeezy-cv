// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { HideToFit } from "@pages/workspace/hide-to-fit";
import {
  bodyOf,
  sampleStore,
  stubAiServer,
} from "@pages/workspace/ai-test-helpers";
import { setFit } from "@store/app/app-slice";
import {
  activeVariantSelector,
  setItemSelection,
} from "@store/jobs/jobs-slice";
import { rankHideCandidates } from "@shared/layout/hide-candidates";
import { vaultSelector } from "@store/vault/vault-slice";
import { AppStore } from "@store/store-helper";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
});

const LINE = 14;

/** A fake paper that draws every item of the vault 3 lines high */
function hiddenCount(store: AppStore): number {
  return Object.values(
    activeVariantSelector(store.getState()).selection
  ).filter((choice) => choice.isVisible === false).length;
}

function setup(askSignal = 0): {
  store: AppStore;
  rerender: (n: number) => void;
} {
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => LINE * 3,
  });
  const store = sampleStore();
  store.dispatch(
    setFit({
      pageCount: 2,
      usedPercent: 130,
      linesOver: 6,
      lineHeightPx: LINE,
      overflowStartsWith: "",
    })
  );
  const items = vaultSelector(store.getState()).sections.flatMap(
    (s) => s.items
  );
  const ui = (signal: number): JSX.Element => (
    <Provider store={store}>
      <div data-cv-paper>
        {items.map((item) => (
          <div key={item.id} data-cv-item={item.id} />
        ))}
      </div>
      <HideToFit askSignal={signal} />
    </Provider>
  );
  const view = render(ui(askSignal));
  return { store, rerender: (n) => view.rerender(ui(n)) };
}

describe("HideToFit", () => {
  it("lists the visible items with the lines each would save", () => {
    setup();
    expect(screen.getAllByText(/saves 3 lines/).length).toBeGreaterThan(0);
  });

  it("ticking only selects; Hide selected hides them in this job", () => {
    const { store } = setup();
    const before = hiddenCount(store);
    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    expect(hiddenCount(store)).toBe(before);
    fireEvent.click(
      screen.getByRole("button", { name: /Hide selected \(2, saves 6 lines\)/ })
    );
    expect(hiddenCount(store)).toBe(before + 2);
    // the vault itself is untouched
    expect(
      vaultSelector(store.getState()).sections.flatMap((s) => s.items).length
    ).toBeGreaterThan(2);
  });

  it("Hide selected is disabled with nothing ticked", () => {
    setup();
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: /Hide selected \(0\)/,
      }).disabled
    ).toBe(true);
  });

  it("an item already hidden is not offered", () => {
    const { store } = setup();
    const count = screen.getAllByRole("checkbox").length;
    const first = rankHideCandidates(
      vaultSelector(store.getState()),
      activeVariantSelector(store.getState())
    ).filter((candidate) => !candidate.isHidden)[0];
    act(() => {
      store.dispatch(
        setItemSelection({
          jobId: activeVariantSelector(store.getState()).id,
          itemId: first.itemId,
          change: { isVisible: false },
        })
      );
    });
    expect(screen.getAllByRole("checkbox")).toHaveLength(count - 1);
  });

  it("the AI only ticks boxes, with reasons; nothing is hidden until confirmed", async () => {
    const itemsAsked: string[] = [];
    const { store, rerender } = setup();
    const hiddenBefore = hiddenCount(store);
    // the server is stubbed after the page is drawn
    stubAiServer((url, init) => {
      if (url !== "/api/ai/hide") {
        return undefined;
      }
      const body = bodyOf<{ candidates: { itemId: string }[] }>(init);
      itemsAsked.push(...body.candidates.map((c) => c.itemId));
      return new Response(
        JSON.stringify({
          suggestions: [
            { itemId: body.candidates[0].itemId, reason: "Least relevant" },
          ],
          warnings: [],
        })
      );
    });
    rerender(1);
    expect(await screen.findByText("Least relevant")).toBeTruthy();
    expect(itemsAsked.length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Hide selected \(1/ })
      ).toBeTruthy()
    );
    expect(hiddenCount(store)).toBe(hiddenBefore);
  });
});
