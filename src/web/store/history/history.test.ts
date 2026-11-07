import { describe, expect, it } from "vitest";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { rootReducer } from "@store/store";
import {
  COALESCE_MS,
  batch,
  clearHistory,
  redo,
  undo,
  withUndo,
} from "@store/history/history";
import { setSelectedBlock, updatePageStructure } from "@store/app/app-slice";
import {
  activeVariantSelector,
  setItemSelection,
  setPageLimit,
  setVariantAppearance,
  setVariants,
} from "@store/variants/variants-slice";
import { setVault, updateItemFields } from "@store/vault/vault-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const file = migrateCvFile(sample);
const job = file.vault.sections.find((s) => s.type === "experience")!;
const item = job.items[0];

/** A store whose clock the test moves */
function setup(): {
  store: ReturnType<typeof makeStore>;
  tick: (ms: number) => void;
} {
  let time = 1_000_000;
  const makeStoreWith = (): ReturnType<typeof makeStore> => makeStore();
  function makeStore() {
    return configureStore({
      reducer: withUndo(combineReducers(rootReducer), () => time),
    });
  }
  const store = makeStoreWith();
  store.dispatch(setVault(file.vault));
  store.dispatch(setVariants([createDefaultVariant(file, "main")]));
  store.dispatch(clearHistory());
  return { store, tick: (ms) => (time += ms) };
}

const rename = (title: string) =>
  updateItemFields({
    sectionId: job.id,
    itemId: item.id,
    fields: { jobTitle: title },
  });

function title(store: ReturnType<typeof setup>["store"]): string | undefined {
  return store
    .getState()
    .vault.sections.find((s) => s.id === job.id)
    ?.items.find((i) => i.id === item.id)?.fields.jobTitle;
}

describe("undo and redo: templates and jobs", () => {
  it("a job edit and a template edit are one step each and undo/redo both", () => {
    const { store, tick } = setup();
    const id = activeVariantSelector(store.getState()).id;
    const before = store.getState().variants;
    store.dispatch(
      setItemSelection({
        jobId: id,
        itemId: item.id,
        change: { isVisible: false },
      })
    );
    tick(COALESCE_MS + 1);
    store.dispatch(setPageLimit({ id, pageLimit: 1 }));
    expect(store.getState().history.past).toHaveLength(2);
    const edited = store.getState().variants;
    expect(edited.jobs).not.toBe(before.jobs);
    expect(edited.templates).not.toBe(before.templates);

    store.dispatch(undo());
    expect(activeVariantSelector(store.getState()).pageLimit).toBe(
      activeVariantSelector({ variants: before }).pageLimit
    );
    expect(
      activeVariantSelector(store.getState()).selection[item.id]?.isVisible
    ).toBe(false);
    store.dispatch(undo());
    expect(store.getState().variants.jobs).toBe(before.jobs);
    expect(store.getState().variants.templates).toBe(before.templates);
    store.dispatch(redo());
    store.dispatch(redo());
    expect(store.getState().variants.jobs).toBe(edited.jobs);
    expect(store.getState().variants.templates).toBe(edited.templates);
  });

  it("undoing a template edit puts the editor's layout and style back too", () => {
    const { store } = setup();
    const id = activeVariantSelector(store.getState()).id;
    const variant = activeVariantSelector(store.getState());
    const style = { ...variant.style, paperMargin: "narrow" as const };
    store.dispatch(setVariantAppearance({ id, layout: variant.layout, style }));
    expect(store.getState().history.past).toHaveLength(1);
    store.dispatch(undo());
    expect(store.getState().cvData.style).toEqual(variant.style);
    expect(store.getState().app.structure).toEqual(variant.layout);
  });
});

describe("undo and redo", () => {
  it("undoes and redoes a vault edit", () => {
    const { store } = setup();
    const original = title(store);
    store.dispatch(rename("Principal"));
    expect(title(store)).toBe("Principal");
    store.dispatch(undo());
    expect(title(store)).toBe(original);
    store.dispatch(redo());
    expect(title(store)).toBe("Principal");
  });

  it("undoes a change to a variant", () => {
    const { store } = setup();
    const id = activeVariantSelector(store.getState()).id;
    store.dispatch(
      setItemSelection({
        jobId: id,
        itemId: item.id,
        change: { isVisible: false },
      })
    );
    expect(
      activeVariantSelector(store.getState()).selection[item.id]?.isVisible
    ).toBe(false);
    store.dispatch(undo());
    expect(
      activeVariantSelector(store.getState()).selection[item.id]
    ).toBeUndefined();
  });

  it("does nothing when there is nothing to undo or redo", () => {
    const { store } = setup();
    const before = store.getState();
    store.dispatch(undo());
    store.dispatch(redo());
    expect(store.getState().vault).toBe(before.vault);
  });

  it("merges quick edits of the same kind (typing) into one step, not slow ones", () => {
    const { store, tick } = setup();
    const original = title(store);
    store.dispatch(rename("P"));
    tick(100);
    store.dispatch(rename("Pr"));
    tick(100);
    store.dispatch(rename("Pri"));
    expect(store.getState().history.past).toHaveLength(1);
    tick(COALESCE_MS + 1);
    store.dispatch(rename("Prin"));
    expect(store.getState().history.past).toHaveLength(2);
    store.dispatch(undo());
    expect(title(store)).toBe("Pri");
    store.dispatch(undo());
    expect(title(store)).toBe(original);
  });

  it("keeps edits of different kinds apart even when quick", () => {
    const { store } = setup();
    const id = activeVariantSelector(store.getState()).id;
    store.dispatch(rename("A"));
    store.dispatch(setPageLimit({ id, pageLimit: 1 }));
    expect(store.getState().history.past).toHaveLength(2);
  });

  it("does not make steps out of selection or other UI changes", () => {
    const { store } = setup();
    store.dispatch(setSelectedBlock({ sectionId: job.id, itemId: item.id }));
    expect(store.getState().history.past).toHaveLength(0);
  });

  it("a new edit after an undo drops what could have been redone", () => {
    const { store, tick } = setup();
    store.dispatch(rename("A"));
    tick(COALESCE_MS + 1);
    store.dispatch(undo());
    expect(store.getState().history.future).toHaveLength(1);
    store.dispatch(rename("B"));
    expect(store.getState().history.future).toHaveLength(0);
    store.dispatch(redo());
    expect(title(store)).toBe("B");
  });

  it("puts the editor's layout back too, so the sync does not undo the undo", () => {
    const { store } = setup();
    const variant = activeVariantSelector(store.getState());
    const original = store.getState().app.structure;
    const changed = {
      ...original,
      fullWidth: [...original.fullWidth].reverse(),
    };
    // what the page-structure screen and `useSyncActiveVariant` do
    store.dispatch(updatePageStructure(changed));
    store.dispatch(
      setVariantAppearance({
        id: variant.id,
        layout: changed,
        style: variant.style,
      })
    );
    store.dispatch(undo());
    expect(store.getState().app.structure).toEqual(original);
    expect(activeVariantSelector(store.getState()).layout).toEqual(original);
  });

  it("a batch is one step with its own label", () => {
    const { store } = setup();
    const id = activeVariantSelector(store.getState()).id;
    store.dispatch(
      batch("Chat: hide and shorten", [
        rename("Batch"),
        setPageLimit({ id, pageLimit: 1 }),
      ])
    );
    expect(store.getState().history.past).toHaveLength(1);
    expect(store.getState().history.past[0].type).toBe(
      "Chat: hide and shorten"
    );
    store.dispatch(undo());
    expect(title(store)).not.toBe("Batch");
  });

  it("clearing the history forgets everything", () => {
    const { store } = setup();
    store.dispatch(rename("A"));
    store.dispatch(clearHistory());
    expect(store.getState().history).toEqual({ past: [], future: [] });
  });
});
