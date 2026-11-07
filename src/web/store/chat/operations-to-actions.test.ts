import { describe, expect, it } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { Operation } from "@custom-types/chat-types";
import { undoableReducer } from "@store/store";
import { operationsToActions } from "@store/chat/operations-to-actions";
import { batch, clearHistory, undo } from "@store/history/history";
import { setVault } from "@store/vault/vault-slice";
import {
  activeJobSelector,
  activeTemplateSelector,
  activeVariantSelector,
  duplicateVariant,
  setVariants,
  variantsSelector,
} from "@store/variants/variants-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const file = migrateCvFile(sample);
const experience = file.vault.sections.find((s) => s.type === "experience")!;
const [job1, job2] = experience.items;

function setup(): ReturnType<
  typeof configureStore<ReturnType<typeof undoableReducer>>
> {
  const store = configureStore({ reducer: undoableReducer });
  store.dispatch(setVault(file.vault));
  store.dispatch(setVariants([createDefaultVariant(file, "main")]));
  store.dispatch(clearHistory());
  return store;
}

function run(store: ReturnType<typeof setup>, operations: Operation[]): number {
  const { actions, skipped } = operationsToActions(
    store.getState(),
    operations
  );
  store.dispatch(batch("Chat: test", actions));
  return skipped;
}

describe("operationsToActions", () => {
  it("hides, highlights and sets tone and page limit through the variant reducers", () => {
    const store = setup();
    run(store, [
      { op: "hideItem", itemId: job1.id, isHidden: true },
      { op: "emphasiseItem", itemId: job2.id, isEmphasised: true },
      { op: "setTone", tone: "formal" },
      { op: "setPageLimit", pages: 1 },
    ]);
    const variant = activeVariantSelector(store.getState());
    expect(variant.selection[job1.id].isVisible).toBe(false);
    expect(variant.selection[job2.id].emphasis).toBe("high");
    expect(variant.tone).toBe("formal");
    expect(variant.pageLimit).toBe(1);
  });

  it("is one undo step, however many operations", () => {
    const store = setup();
    const before = activeVariantSelector(store.getState());
    run(store, [
      { op: "hideItem", itemId: job1.id, isHidden: true },
      { op: "setTone", tone: "formal" },
    ]);
    expect(store.getState().history.past).toHaveLength(1);
    expect(store.getState().history.past[0].type).toBe("Chat: test");
    store.dispatch(undo());
    expect(activeVariantSelector(store.getState())).toEqual(before);
  });

  it("several moves add up (each is worked out after the one before)", () => {
    const store = setup();
    const [, , job3] = experience.items;
    run(store, [
      { op: "moveItem", itemId: job3.id, position: 1 },
      { op: "moveItem", itemId: job2.id, position: 1 },
    ]);
    const order = Object.entries(
      activeVariantSelector(store.getState()).selection
    )
      .map(([id, choice]) => [id, choice.order] as const)
      .sort((a, b) => (a[1] ?? 99) - (b[1] ?? 99))
      .map(([id]) => id);
    expect(order.slice(0, 2)).toEqual([job2.id, job3.id]);
  });

  it("moves a section in the editor's layout and in the variant, in the same step", () => {
    const store = setup();
    const ids = file.vault.sections.map((s) => s.id);
    const last = ids.at(-1)!;
    run(store, [{ op: "moveSection", sectionId: last, position: 1 }]);
    const flat = (layout: {
      fullWidth: string[];
      left: string[];
      right: string[];
    }): string[] =>
      [...layout.fullWidth, ...layout.left, ...layout.right].filter((id) =>
        ids.includes(id)
      );
    expect(flat(store.getState().app.structure)[0]).toBe(last);
    expect(flat(activeVariantSelector(store.getState()).layout)[0]).toBe(last);
    expect(store.getState().history.past).toHaveLength(1);
    store.dispatch(undo());
    expect(flat(store.getState().app.structure)[0]).toBe(ids[0]);
  });

  it("a rewording adds an alternative wording and selects it, never changing the original text", () => {
    const store = setup();
    const bullet = job1.bullets[0];
    run(store, [
      {
        op: "rewriteBullet",
        itemId: job1.id,
        bulletId: bullet.id,
        wording: "short",
        text: "Led a React dashboard",
      },
    ]);
    const stored = store
      .getState()
      .vault.sections.find((s) => s.id === experience.id)!
      .items.find((i) => i.id === job1.id)!.bullets[0];
    expect(stored.text).toBe(bullet.text);
    expect(stored.alt?.short).toBe("Led a React dashboard");
    expect(
      activeVariantSelector(store.getState()).selection[job1.id].bullets?.[
        bullet.id
      ].wording
    ).toBe("short");
    store.dispatch(undo());
    const back = store
      .getState()
      .vault.sections.find((s) => s.id === experience.id)!
      .items.find((i) => i.id === job1.id)!.bullets[0];
    expect(back.alt).toBeUndefined();
  });

  it("skips operations about things that are not there, and counts them", () => {
    const store = setup();
    const skipped = run(store, [
      { op: "hideItem", itemId: "gone", isHidden: true },
      { op: "moveItem", itemId: "gone", position: 1 },
      { op: "moveSection", sectionId: "gone", position: 1 },
      { op: "hideItem", itemId: job1.id, isHidden: true },
    ]);
    expect(skipped).toBe(3);
    expect(
      activeVariantSelector(store.getState()).selection[job1.id].isVisible
    ).toBe(false);
  });

  it("writes tone and item choices to the job, and page limit and layout to the template", () => {
    const store = setup();
    // a second job that shares the template
    store.dispatch(duplicateVariant({ sourceId: "main", id: "other" }));
    store.dispatch({
      type: "variants/setActiveVariant",
      payload: { id: "main" },
    });
    const templateBefore = activeTemplateSelector(store.getState());
    const sectionId = experience.id;
    run(store, [
      { op: "hideItem", itemId: job1.id, isHidden: true },
      { op: "setTone", tone: "formal" },
      { op: "setPageLimit", pages: templateBefore.pageLimit === 1 ? 2 : 1 },
      { op: "moveSection", sectionId, position: 99 },
    ]);
    const state = store.getState();
    const [main, other] = variantsSelector(state);
    expect(main.selection[job1.id].isVisible).toBe(false);
    expect(main.tone).toBe("formal");
    // the other job only sees the template's changes
    expect(other.selection[job1.id]).toBeUndefined();
    expect(other.tone).not.toBe("formal");
    expect(activeJobSelector(state).templateId).toBe(templateBefore.id);
    expect(other.pageLimit).toBe(activeTemplateSelector(state).pageLimit);
    expect(other.pageLimit).not.toBe(templateBefore.pageLimit);
    expect(other.layout).toEqual(main.layout);
  });
});
