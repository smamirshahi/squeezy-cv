// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { PreviewPage } from "@pages/preview-page/preview-page";
import {
  measureBlocks,
  measurePagination,
} from "@pages/preview-page/use-pagination";
import { EditorJobs } from "@pages/editor-page/sections/editor-jobs";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setStyle } from "@store/cv-data/cv-data-slice";
import { setVariants, variantsSelector } from "@store/variants/variants-slice";
import { setVault } from "@store/vault/vault-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

/** jsdom has no layout, so give elements the positions we want */
function setRect(element: Element, top: number, height: number): void {
  element.getBoundingClientRect = () =>
    ({
      top,
      height,
      bottom: top + height,
    }) as DOMRect;
}

function fakeLayout(paper: HTMLElement, scrollHeight: number): void {
  Object.defineProperty(paper, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
}

describe("measuring", () => {
  it("reads block positions relative to the origin and the keep-with-next flag", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<p data-cv-block="" data-cv-keep="">h</p><p data-cv-block="">b</p><p>x</p>';
    const [heading, body] = Array.from(root.querySelectorAll("p"));
    setRect(heading, 120, 20);
    setRect(body, 140, 50);

    expect(measureBlocks(root, 100)).toEqual([
      { top: 20, height: 20, shouldKeepWithNext: true },
      { top: 40, height: 50, shouldKeepWithNext: false },
    ]);
  });

  it("does not count rounding as another page: a CV that exactly fills A4 is one page", () => {
    const paper = document.createElement("div");
    setRect(paper, 0, 0);
    // A4 is 1122.52 px high; browsers report the scroll height as a whole number: 1123
    fakeLayout(paper, 1123);
    expect(measurePagination(paper, 10).pageCount).toBe(1);
    // a real overflow still counts
    fakeLayout(paper, 1123 + 40);
    expect(measurePagination(paper, 10).pageCount).toBe(2);
  });

  it("counts the pages of a paper from its measured height", () => {
    const paper = document.createElement("div");
    setRect(paper, 0, 0);
    // narrow margin 10 mm: one page holds 277 mm = about 1047 px
    fakeLayout(paper, 2400);
    const result = measurePagination(paper, 10);
    expect(result.pageCount).toBe(3);
    expect(result.breaks).toHaveLength(2);
  });
});

function makeStore(): AppStore {
  const store = configureStore({ reducer: rootReducer });
  const file = migrateCvFile(sample);
  store.dispatch(setVault(file.vault));
  store.dispatch(setStyle(file.style));
  store.dispatch(setVariants([createDefaultVariant(file, "v1")]));
  return store;
}

describe("page status in the preview", () => {
  it("shows the page count and the limit", () => {
    render(
      <Provider store={makeStore()}>
        <PreviewPage contentRef={{ current: null }} />
      </Provider>
    );
    expect(screen.getByText(/^1 page \(limit 2\)/)).toBeTruthy();
  });

  it("warns when the CV is longer than the limit and shows the page start", () => {
    const store = makeStore();
    const original = HTMLElement.prototype.getBoundingClientRect;
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get: () => 3200,
    });
    HTMLElement.prototype.getBoundingClientRect = () =>
      ({
        top: 0,
        height: 0,
        bottom: 0,
      }) as DOMRect;
    try {
      const { container } = render(
        <Provider store={store}>
          <PreviewPage contentRef={{ current: null }} />
        </Provider>
      );
      expect(screen.getByText(/This CV is 3 pages long/)).toBeTruthy();
      expect(container.querySelectorAll(".cv-page-marker")).toHaveLength(2);
      expect(screen.getByText("Page 2")).toBeTruthy();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
      delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
    }
  });

  it("lets the page limit be changed per variant", () => {
    const store = makeStore();
    render(
      <Provider store={store}>
        <EditorJobs />
      </Provider>
    );
    fireEvent.mouseDown(screen.getByLabelText("Page limit"));
    fireEvent.click(screen.getByRole("option", { name: "1 page" }));
    expect(variantsSelector(store.getState())[0].pageLimit).toBe(1);
  });
});
