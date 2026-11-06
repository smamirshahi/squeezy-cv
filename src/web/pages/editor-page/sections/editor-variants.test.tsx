// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setStyle } from "@store/cv-data/cv-data-slice";
import { setVault } from "@store/vault/vault-slice";
import { setVariants } from "@store/variants/variants-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { EditorPageStructure } from "@pages/editor-page/sections/editor-page-structure/editor-page-structure";
import { EditorVariants } from "@pages/editor-page/sections/editor-variants";
import { useSyncActiveVariant } from "@hooks/use-sync-active-variant";
import { updatePageStructure } from "@store/app/app-slice";
import { act } from "@testing-library/react";

afterEach(cleanup);

function Page(): JSX.Element {
  useSyncActiveVariant();
  return <EditorVariants />;
}

function makeStore(): AppStore {
  const store = configureStore({ reducer: rootReducer });
  const file = migrateCvFile(sample);
  store.dispatch(setVault(file.vault));
  store.dispatch(setStyle(file.style));
  store.dispatch(setVariants([createDefaultVariant(file, "v1", undefined)]));
  return store;
}

function show(store: AppStore): void {
  render(
    <Provider store={store}>
      <Page />
    </Provider>
  );
}

describe("EditorVariants", () => {
  it("creates, duplicates, switches and renames variants", () => {
    const store = makeStore();
    show(store);

    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(store.getState().variants.variants).toHaveLength(2);

    fireEvent.change(screen.getByLabelText("Variant name"), {
      target: { value: "Acme" },
    });
    expect(store.getState().variants.variants[1].name).toBe("Acme");

    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    const { variants, activeId } = store.getState().variants;
    expect(variants).toHaveLength(3);
    expect(variants[2].name).toBe("Acme (copy)");
    expect(activeId).toBe(variants[2].id);
  });

  it("deletes only after confirming, and never the last variant", () => {
    const store = makeStore();
    show(store);
    expect(
      screen.getByRole("button", { name: "Delete" }).hasAttribute("disabled")
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "New" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(store.getState().variants.variants).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" }).pop()!);
    expect(store.getState().variants.variants).toHaveLength(1);
    expect(store.getState().variants.activeId).toBe("v1");
  });

  it("hides an item in the active variant only, without touching the vault", () => {
    const store = makeStore();
    show(store);
    const vaultBefore = JSON.stringify(store.getState().vault);
    const boxes = screen.getAllByRole("checkbox");

    fireEvent.click(boxes[0]);

    const selection = store.getState().variants.variants[0].selection;
    expect(Object.values(selection).some((s) => s.isVisible === false)).toBe(
      true
    );
    expect(JSON.stringify(store.getState().vault)).toBe(vaultBefore);
  });

  it("keeps the page layout per variant", () => {
    const store = makeStore();
    show(store);
    const custom = { fullWidth: ["personalInfo"], left: [], right: [] };

    act(() => {
      store.dispatch(updatePageStructure(custom));
    });
    expect(store.getState().variants.variants[0].layout).toEqual(custom);

    fireEvent.click(screen.getByRole("button", { name: "New" }));
    act(() => {
      store.dispatch(
        updatePageStructure({
          fullWidth: [],
          left: ["personalInfo"],
          right: [],
        })
      );
    });
    // the first variant kept its own layout
    expect(store.getState().variants.variants[0].layout).toEqual(custom);

    // switching back loads it into the editor
    fireEvent.mouseDown(screen.getByLabelText("Active variant"));
    fireEvent.click(screen.getAllByRole("option")[0]);
    expect(store.getState().app.structure).toEqual(custom);
  });
});

describe("layout templates", () => {
  it("switches between the single-column and two-column template", () => {
    const store = makeStore();
    render(
      <Provider store={store}>
        <EditorPageStructure />
      </Provider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Two columns" }));
    expect(store.getState().app.structure.left).toEqual(["experience"]);

    fireEvent.click(screen.getByRole("button", { name: "Single column (UK)" }));
    const { fullWidth, left, right } = store.getState().app.structure;
    expect(left).toEqual([]);
    expect(right).toEqual([]);
    expect(fullWidth).toContain("experience");
  });

  it("starts new variants as one column", () => {
    const layout = createDefaultVariant(migrateCvFile(sample), "x").layout;
    expect(layout.left).toEqual([]);
    expect(layout.right).toEqual([]);
    expect(layout.fullWidth.slice(0, 2)).toEqual([
      "personalInfo",
      "contactInfo",
    ]);
  });
});
