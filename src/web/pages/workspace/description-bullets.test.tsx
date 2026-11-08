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
import { DescriptionBullets } from "@pages/workspace/description-bullets";
import { undoableReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { clearHistory, undo } from "@store/history/history";
import { activeVariantSelector, setVariants } from "@store/jobs/jobs-slice";
import { setVault } from "@store/vault/vault-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { BulletsResult } from "@custom-types/bullets-types";
import { Item } from "@custom-types/vault-types";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const file = migrateCvFile(sample);
const source = file.vault.sections
  .flatMap((s) => s.items)
  .find((i) => i.bullets.length > 0)!;

function withDescription(description: string): Item {
  return { ...source, fields: { ...source.fields, description } };
}

function stub(result: BulletsResult | { status: number; message: string }) {
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

function setup(item: Item): AppStore {
  const store: AppStore = configureStore({ reducer: undoableReducer });
  store.dispatch(setVault(file.vault));
  store.dispatch(setVariants([createDefaultVariant(file, "main")]));
  store.dispatch(clearHistory());
  render(
    <Provider store={store}>
      <DescriptionBullets item={item} />
    </Provider>
  );
  return store;
}

function generated(store: AppStore) {
  return activeVariantSelector(store.getState()).selection[source.id]
    ?.generated;
}

const proposal: BulletsResult = {
  itemId: source.id,
  bullets: [
    { text: "Led the platform team", flags: [] },
    { text: "Cut costs by 97%", flags: ['number "97" is not in your CV'] },
  ],
};

describe("DescriptionBullets", () => {
  it("without a description it says where to write one and offers no AI buttons", () => {
    setup(withDescription(""));
    expect(
      screen.getByText(/Write what you did in the Description/)
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Make bullets" })).toBeNull();
  });

  it("shows a proposal; only the ticked bullets are saved in the job, as one undo step", async () => {
    const fetchMock = stub(proposal);
    const store = setup(withDescription("Led the platform team."));
    fireEvent.click(screen.getByRole("button", { name: "Make bullets" }));
    await screen.findByText("Led the platform team");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];
    expect(url).toBe("/api/ai/bullets");
    expect(JSON.parse(init.body)).toMatchObject({
      itemId: source.id,
      mode: "make",
    });
    // nothing changes until the user accepts
    expect(generated(store)).toBeUndefined();

    // the flagged one starts unticked, with the reason
    expect(screen.getByText(/not in your description/)).toBeTruthy();
    const boxes = screen.getAllByRole<HTMLInputElement>("checkbox");
    expect(boxes.map((box) => box.checked)).toEqual([true, false]);

    fireEvent.click(screen.getByRole("button", { name: "Use these bullets" }));
    expect(generated(store)?.map((b) => b.text)).toEqual([
      "Led the platform team",
    ]);
    // the vault's bullets are untouched
    expect(
      store
        .getState()
        .vault.sections.flatMap((s) => s.items)
        .find((i) => i.id === source.id)!.bullets
    ).toEqual(source.bullets);

    store.dispatch(undo());
    expect(generated(store)).toBeUndefined();
  });

  it("goes back to the vault's bullets", async () => {
    stub(proposal);
    const store = setup(withDescription("Led the platform team."));
    fireEvent.click(screen.getByRole("button", { name: "Make bullets" }));
    await screen.findByText("Led the platform team");
    fireEvent.click(screen.getByRole("button", { name: "Use these bullets" }));
    expect(generated(store)).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("button", { name: /Use the vault’s bullets instead/ })
    );
    expect(generated(store)).toBeUndefined();
  });

  it("shows the server's message when it fails and changes nothing", async () => {
    stub({ status: 503, message: "AI is not set up." });
    const store = setup(withDescription("Led the platform team."));
    fireEvent.click(screen.getByRole("button", { name: "Make bullets" }));
    await waitFor(() => screen.getByText("AI is not set up."));
    expect(generated(store)).toBeUndefined();
  });
});
