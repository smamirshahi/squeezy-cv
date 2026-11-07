// @vitest-environment jsdom
import { Variant } from "@custom-types/variant-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
import { PreviewPage } from "@pages/preview-page/preview-page";
import { EditorVariants } from "@pages/editor-page/sections/editor-variants";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setStyle } from "@store/cv-data/cv-data-slice";
import {
  setAutoFit,
  setPageLimit,
  setTuning,
  setVariants,
  variantsSelector,
} from "@store/variants/variants-slice";
import { setVault } from "@store/vault/vault-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { VariantSchema } from "@custom-types/variant-types";

/**
 * jsdom has no layout, so the "browser" is faked: the paper's height follows the
 * --cv-spacing and --cv-font-scale it has been given, like real content would.
 */
const CONTENT_HEIGHT_PX = 1300;
const savedScrollHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollHeight"
);

function fakeLayout(contentPx: number): void {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get(this: HTMLElement) {
      const spacing = Number(this.style.getPropertyValue("--cv-spacing") || 1);
      const font = Number(this.style.getPropertyValue("--cv-font-scale") || 1);
      return Math.round(contentPx * (0.7 + 0.3 * spacing) * font * font);
    },
  });
}

beforeEach(() => {
  fakeLayout(CONTENT_HEIGHT_PX);
});

afterEach(() => {
  cleanup();
  if (savedScrollHeight) {
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollHeight",
      savedScrollHeight
    );
  } else {
    delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
  }
});

function makeStore(): AppStore {
  const store = configureStore({ reducer: rootReducer });
  const file = migrateCvFile(sample);
  store.dispatch(setVault(file.vault));
  store.dispatch(setStyle(file.style));
  store.dispatch(setVariants([createDefaultVariant(file, "v1")]));
  return store;
}

function show(store: AppStore): void {
  render(
    <Provider store={store}>
      <PreviewPage contentRef={{ current: null }} />
    </Provider>
  );
}

function variantOf(store: AppStore): Variant {
  return variantsSelector(store.getState())[0];
}

describe("auto-fit in the preview", () => {
  it("does nothing while it is off: the page keeps the style's own values", () => {
    const store = makeStore();
    store.dispatch(setPageLimit({ id: "v1", pageLimit: 1 }));
    show(store);

    // 1300 px content is more than one page of ~1047 px: warns but changes nothing
    expect(screen.getByText(/This CV is 2 pages long/)).toBeTruthy();
    expect(screen.queryByText(/Auto-fit changed/)).toBeNull();
    expect(variantOf(store).tuning).toBeUndefined();
  });

  it("shrinks until the CV fits the limit and saves the result in the variant", () => {
    const store = makeStore();
    store.dispatch(setPageLimit({ id: "v1", pageLimit: 1 }));
    store.dispatch(setAutoFit({ id: "v1", isAutoFit: true }));
    show(store);

    expect(screen.getByText(/1 page \(limit 1\)/)).toBeTruthy();
    expect(screen.getByText(/Auto-fit changed: Spacing/)).toBeTruthy();
    const { tuning } = variantOf(store);
    expect(tuning).toBeDefined();
    expect(tuning?.spacing).toBeLessThan(1);
    expect(tuning?.spacing).toBeGreaterThanOrEqual(0.4);
    expect(VariantSchema.guard(variantOf(store))).toBe(true);
  });

  it("says so when it cannot fit, and stays within the floors", () => {
    fakeLayout(CONTENT_HEIGHT_PX * 3);
    const store = makeStore();
    store.dispatch(setPageLimit({ id: "v1", pageLimit: 1 }));
    store.dispatch(setAutoFit({ id: "v1", isAutoFit: true }));
    show(store);

    expect(
      screen.getByText(/does not fit even with the smallest/)
    ).toBeTruthy();
    const tuning = variantOf(store).tuning;
    expect(tuning?.spacing).toBeGreaterThanOrEqual(0.4);
    expect(tuning?.marginMm).toBeGreaterThanOrEqual(10);
    expect(tuning?.fontScale).toBeGreaterThanOrEqual(0.7);
  });

  it("fills the page in fill mode without going over the limit", () => {
    fakeLayout(600);
    const store = makeStore();
    store.dispatch(setPageLimit({ id: "v1", pageLimit: 1 }));
    store.dispatch(setAutoFit({ id: "v1", isAutoFit: true, fitMode: "fill" }));
    show(store);

    const tuning = variantOf(store).tuning;
    expect(tuning?.spacing).toBeGreaterThan(1);
    expect(screen.getByText(/1 page \(limit 1\)/)).toBeTruthy();
  });

  it("starts again when the limit changes", () => {
    const store = makeStore();
    store.dispatch(setPageLimit({ id: "v1", pageLimit: 2 }));
    store.dispatch(setAutoFit({ id: "v1", isAutoFit: true }));
    show(store);
    expect(variantOf(store).tuning?.spacing).toBe(1);

    act(() => {
      store.dispatch(setPageLimit({ id: "v1", pageLimit: 1 }));
    });
    expect(variantOf(store).tuning?.spacing).toBeLessThan(1);
  });

  it("clears the saved result when auto-fit is turned off", () => {
    const store = makeStore();
    store.dispatch(setAutoFit({ id: "v1", isAutoFit: true }));
    store.dispatch(
      setTuning({
        id: "v1",
        tuning: { spacing: 0.5, marginMm: 12, fontScale: 1 },
      })
    );
    store.dispatch(setAutoFit({ id: "v1", isAutoFit: false }));
    expect(variantOf(store).tuning).toBeUndefined();
  });

  it("is switched on and off from the Variants page", () => {
    const store = makeStore();
    render(
      <Provider store={store}>
        <EditorVariants />
      </Provider>
    );
    fireEvent.click(screen.getByLabelText("Auto-fit to the page limit"));
    expect(variantOf(store).isAutoFit).toBe(true);
    fireEvent.click(screen.getByLabelText("Auto-fit to the page limit"));
    expect(variantOf(store).isAutoFit).toBe(false);
  });
});
