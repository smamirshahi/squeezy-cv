// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import { FitPanel } from "@pages/workspace/fit-panel";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setFit } from "@store/app/app-slice";
import {
  activeVariantSelector,
  setVariants,
} from "@store/variants/variants-slice";
import { setVault } from "@store/vault/vault-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const file = migrateCvFile(sample);
const jobs = file.vault.sections.find((s) => s.type === "experience")!.items;

beforeEach(() => {
  // every item on the page is 3 lines tall (16 px lines)
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => 48,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stub(
  isConfigured: boolean,
  answer?: unknown,
  status = 200
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string) =>
    Promise.resolve(
      new Response(
        JSON.stringify(
          url === "/api/ai/status"
            ? { isConfigured, provider: "ollama" }
            : answer
        ),
        { status: url === "/api/ai/status" ? 200 : status }
      )
    )
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function show(): AppStore {
  const store: AppStore = configureStore({ reducer: rootReducer });
  store.dispatch(setVault(file.vault));
  store.dispatch(setVariants([createDefaultVariant(file, "base")]));
  store.dispatch(
    setFit({
      pageCount: 2,
      usedPercent: 100,
      linesOver: 4,
      lineHeightPx: 16,
      overflowStartsWith: "",
    })
  );
  render(
    <Provider store={store}>
      {jobs.map((job) => (
        <div key={job.id} data-cv-item={job.id} />
      ))}
      <FitPanel />
    </Provider>
  );
  return store;
}

describe("FitPanel: Ask AI to pick what to hide", () => {
  it("is not offered without AI", async () => {
    stub(false);
    show();
    await screen.findByText("Hide to gain lines");
    await waitFor(() =>
      expect(screen.queryByText("Ask AI to pick what to hide")).toBeNull()
    );
  });

  it("sends labels and measured lines, shows the suggestion, and hides only after confirming", async () => {
    const fetchMock = stub(true, {
      suggestions: [{ itemId: jobs[0].id, reason: "Oldest role" }],
      warnings: [],
    });
    const store = show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Ask AI to pick what to hide" })
    );
    const region = await screen.findByRole("region", { name: "AI suggestion" });
    expect(region.textContent).toContain("Oldest role");

    const call = fetchMock.mock.calls.find(([url]) => url === "/api/ai/hide")!;
    const body = JSON.parse(call[1].body);
    expect(body.linesOver).toBe(4);
    expect(body.candidates[0]).toMatchObject({ lines: 3 });
    expect(JSON.stringify(body)).not.toContain("jane.doe");
    // nothing hidden yet
    expect(
      activeVariantSelector(store.getState()).selection[jobs[0].id]?.isVisible
    ).not.toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Hide these" }));
    expect(
      activeVariantSelector(store.getState()).selection[jobs[0].id]?.isVisible
    ).toBe(false);
  });

  it("shows an error from the server and changes nothing", async () => {
    stub(true, { code: "ai_failed", message: "The AI did not answer." }, 502);
    const store = show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Ask AI to pick what to hide" })
    );
    await screen.findByText("The AI did not answer.");
    expect(screen.queryByRole("region", { name: "AI suggestion" })).toBeNull();
    expect(
      activeVariantSelector(store.getState()).selection[jobs[0].id]?.isVisible
    ).not.toBe(false);
  });
});
