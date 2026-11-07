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
import { BulletAiActions } from "@pages/workspace/bullet-ai-actions";
import { RelevanceBadge } from "@pages/workspace/relevance-badge";
import { undoableReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { clearHistory, undo } from "@store/history/history";
import { activeVariantSelector, setVariants } from "@store/jobs/jobs-slice";
import { setVault } from "@store/vault/vault-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { RewriteResult } from "@custom-types/rewrite-types";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const file = migrateCvFile(sample);
const item = file.vault.sections
  .flatMap((s) => s.items)
  .find((i) => i.bullets.length > 0)!;
const bullet = item.bullets[0];

function stub(result: RewriteResult | { status: number; message: string }) {
  const fetchMock = vi.fn(() => {
    if ("status" in result) {
      return Promise.resolve(
        new Response(JSON.stringify({ code: "x", message: result.message }), {
          status: result.status,
        })
      );
    }
    return Promise.resolve(new Response(JSON.stringify(result)));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setup(): AppStore {
  const store: AppStore = configureStore({ reducer: undoableReducer });
  store.dispatch(setVault(file.vault));
  store.dispatch(setVariants([createDefaultVariant(file, "main")]));
  store.dispatch(clearHistory());
  render(
    <Provider store={store}>
      <BulletAiActions item={item} bullet={bullet} />
    </Provider>
  );
  return store;
}

const proposal: RewriteResult = {
  itemId: item.id,
  bulletId: bullet.id,
  wording: "short",
  text: "Shorter text",
  flags: [],
};

function storedBullet(store: AppStore) {
  return store
    .getState()
    .vault.sections.flatMap((s) => s.items)
    .find((i) => i.id === item.id)!
    .bullets.find((b) => b.id === bullet.id)!;
}

describe("BulletAiActions", () => {
  it("shows the proposal; using it stores an alternative wording, selects it and is one undo step", async () => {
    const fetchMock = stub(proposal);
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Shorten bullet/ }));
    await screen.findByText("Shorter text");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];
    expect(url).toBe("/api/ai/rewrite");
    expect(JSON.parse(init.body)).toMatchObject({
      itemId: item.id,
      bulletId: bullet.id,
      mode: "shorten",
    });
    // nothing changes until the user accepts
    expect(storedBullet(store).alt?.short).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Use this wording" }));
    const after = storedBullet(store);
    expect(after.text).toBe(bullet.text);
    expect(after.alt?.short).toBe("Shorter text");
    const selected = activeVariantSelector(store.getState()).selection[item.id]
      ?.bullets?.[bullet.id];
    expect(selected?.wording).toBe("short");

    store.dispatch(undo());
    expect(storedBullet(store).alt?.short).toBeUndefined();
    const undone = activeVariantSelector(store.getState()).selection[item.id]
      ?.bullets?.[bullet.id];
    expect(undone?.wording).toBeUndefined();
  });

  it("warns about a flagged rewording and needs a tick before it can be used", async () => {
    stub({
      ...proposal,
      wording: "long",
      flags: ['number "97" is not in your CV'],
    });
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Extend bullet/ }));
    await screen.findByText(/number "97" is not in your CV/);
    const use = screen.getByRole<HTMLButtonElement>("button", {
      name: "Use this wording",
    });
    expect(use.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("I checked it is true"));
    expect(use.disabled).toBe(false);
    fireEvent.click(use);
    expect(storedBullet(store).alt?.long).toBe("Shorter text");
  });

  it("discard changes nothing, and an error is shown", async () => {
    stub(proposal);
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Rephrase bullet/ }));
    await screen.findByText("Shorter text");
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.queryByText("Shorter text")).toBeNull();
    expect(storedBullet(store).alt).toBeUndefined();

    stub({ status: 503, message: "AI is not set up." });
    fireEvent.click(screen.getByRole("button", { name: /^Shorten bullet/ }));
    await waitFor(() => screen.getByText("AI is not set up."));
  });
});

describe("RelevanceBadge", () => {
  it("shows the score or that it is not scored", () => {
    const { rerender } = render(<RelevanceBadge relevance={72.4} />);
    expect(screen.getByText("Relevance 72")).toBeTruthy();
    rerender(<RelevanceBadge relevance={undefined} />);
    expect(screen.getByText("Not scored")).toBeTruthy();
  });
});
