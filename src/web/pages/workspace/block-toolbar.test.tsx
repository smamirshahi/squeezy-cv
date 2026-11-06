// @vitest-environment jsdom
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { BlockToolbar } from "@pages/workspace/block-toolbar";
import { setSelectedBlock } from "@store/app/app-slice";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import {
  activeVariantSelector,
  setVariants,
} from "@store/variants/variants-slice";
import { setVault } from "@store/vault/vault-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";

afterEach(cleanup);

const file = migrateCvFile(sample);
const section = file.vault.sections.find((s) => s.type === "experience")!;
const [first, second] = section.items;

function setup(): AppStore {
  const store: AppStore = configureStore({ reducer: rootReducer });
  store.dispatch(setVault(file.vault));
  store.dispatch(setVariants([createDefaultVariant(file, "main")]));
  const ref = createRef<HTMLElement>();
  render(
    <Provider store={store}>
      <main ref={ref} style={{ position: "relative" }}>
        <div data-cv-paper="">
          <div data-cv-item={first.id} />
          <div data-cv-item={second.id} />
        </div>
        <BlockToolbar canvasRef={ref} />
      </main>
    </Provider>
  );
  return store;
}

function select(store: AppStore, itemId?: string): void {
  act(() => {
    store.dispatch(setSelectedBlock({ sectionId: section.id, itemId }));
  });
}

describe("floating block toolbar", () => {
  it("shows only while an item is selected", () => {
    const store = setup();
    expect(screen.queryByRole("toolbar")).toBeNull();
    select(store);
    expect(screen.queryByRole("toolbar")).toBeNull();
    select(store, first.id);
    expect(
      screen.getByRole("toolbar", { name: "Selected block" })
    ).toBeTruthy();
  });

  it("hides, emphasises and moves the item for the active variant only", () => {
    const store = setup();
    select(store, first.id);

    fireEvent.click(screen.getByRole("button", { name: "Hide block" }));
    expect(
      activeVariantSelector(store.getState()).selection[first.id]?.isVisible
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Show block" }));

    fireEvent.click(screen.getByRole("button", { name: "Emphasis" }));
    expect(
      activeVariantSelector(store.getState()).selection[first.id]?.emphasis
    ).toBe("high");

    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Move block up",
      }).disabled
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Move block down" }));
    const selection = activeVariantSelector(store.getState()).selection;
    expect(selection[first.id].order).toBeGreaterThan(
      selection[second.id].order ?? -1
    );
    expect(store.getState().vault.sections).toEqual(file.vault.sections);
  });
});
