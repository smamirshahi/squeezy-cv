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
import sample from "@fixtures/sample-cv.json";
import { ScoreItems } from "@pages/editor-page/sections/score-items";
import { RelevanceBadge } from "@pages/workspace/relevance-badge";
import { undoableReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { clearHistory, undo } from "@store/history/history";
import {
  activeJobSelector,
  activeVariantSelector,
  setItemScores,
  setVariants,
} from "@store/jobs/jobs-slice";
import { setVault } from "@store/vault/vault-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const file = migrateCvFile(sample);
const items = file.vault.sections.flatMap((s) => s.items);

function setup(
  score: unknown,
  status: unknown = { isConfigured: true, provider: "ollama" }
): { store: AppStore; fetchMock: ReturnType<typeof vi.fn> } {
  const fetchMock = vi.fn((url: string) => {
    if (url === "/api/ai/status") {
      return Promise.resolve(new Response(JSON.stringify(status)));
    }
    if (typeof score === "object" && score && "status" in score) {
      return Promise.resolve(
        new Response(JSON.stringify({ code: "x", message: "AI is down" }), {
          status: 503,
        })
      );
    }
    return Promise.resolve(new Response(JSON.stringify(score)));
  });
  vi.stubGlobal("fetch", fetchMock);
  const store: AppStore = configureStore({ reducer: undoableReducer });
  store.dispatch(setVault(file.vault));
  store.dispatch(setVariants([createDefaultVariant(file, "main")]));
  store.dispatch(clearHistory());
  render(
    <Provider store={store}>
      <ScoreItems />
    </Provider>
  );
  return { store, fetchMock };
}

const answer = {
  scores: [
    { itemId: items[0].id, relevance: 91, reason: "Uses React daily" },
    { itemId: items[1].id, relevance: 12, reason: "Unrelated" },
  ],
  warnings: ['1 item in "X" got no score.'],
};

describe("ScoreItems", () => {
  it("scores the items, stores the advert, shows warnings and is one undo step", async () => {
    const { store, fetchMock } = setup(answer);
    const button = await screen.findByRole<HTMLButtonElement>("button", {
      name: "Score items",
    });
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Job advert"), {
      target: { value: "  We need React  " },
    });
    await waitFor(() => expect(button.disabled).toBe(false));
    fireEvent.click(button);
    await screen.findByText("Scored 2 items.");
    expect(screen.getByText(/got no score/)).toBeTruthy();
    const body = JSON.parse(
      (
        fetchMock.mock.calls.find((c) => c[0] === "/api/ai/score")![1] as {
          body: string;
        }
      ).body
    );
    expect(body.jobAd).toBe("  We need React  ");

    const selection = activeVariantSelector(store.getState()).selection;
    expect(selection[items[0].id]).toMatchObject({
      relevance: 91,
      relevanceReason: "Uses React daily",
    });
    expect(selection[items[0].id].isVisible).not.toBe(false);
    expect(activeJobSelector(store.getState()).jobAd).toBe("We need React");

    store.dispatch(undo());
    expect(
      activeVariantSelector(store.getState()).selection[items[0].id]?.relevance
    ).toBeUndefined();
    expect(activeJobSelector(store.getState()).jobAd).toBeUndefined();
  });

  it("starts from the stored advert of the job", async () => {
    const { store } = setup(answer);
    store.dispatch(
      setItemScores({
        jobId: activeJobSelector(store.getState()).id,
        jobAd: "Stored advert",
        scores: [],
      })
    );
    cleanup();
    render(
      <Provider store={store}>
        <ScoreItems />
      </Provider>
    );
    expect(
      (await screen.findByLabelText<HTMLTextAreaElement>("Job advert")).value
    ).toBe("Stored advert");
  });

  it("shows the error and keeps the old scores when the request fails", async () => {
    const { store } = setup({ status: 503 });
    fireEvent.change(await screen.findByLabelText("Job advert"), {
      target: { value: "advert" },
    });
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>("button", { name: "Score items" })
          .disabled
      ).toBe(false)
    );
    fireEvent.click(screen.getByRole("button", { name: "Score items" }));
    await screen.findByText("AI is down");
    expect(
      Object.values(activeVariantSelector(store.getState()).selection).some(
        (s) => s.relevance !== undefined
      )
    ).toBe(false);
  });

  it("says AI is not set up and disables the button", async () => {
    setup(answer, { isConfigured: false, provider: "claude" });
    await screen.findByText(/AI is not set up/);
    fireEvent.change(screen.getByLabelText("Job advert"), {
      target: { value: "advert" },
    });
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Score items" })
        .disabled
    ).toBe(true);
  });
});

describe("RelevanceBadge bands", () => {
  it("names the band in its label and has the reason", () => {
    const { rerender } = render(
      <RelevanceBadge relevance={85} reason="Uses React" />
    );
    expect(
      screen.getByLabelText(/85 of 100 \(related\)\. Uses React/)
    ).toBeTruthy();
    rerender(<RelevanceBadge relevance={50} />);
    expect(screen.getByLabelText(/\(maybe\)/)).toBeTruthy();
    rerender(<RelevanceBadge relevance={10} />);
    expect(screen.getByLabelText(/\(unrelated\)/)).toBeTruthy();
  });
});
