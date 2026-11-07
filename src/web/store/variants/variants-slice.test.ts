import { describe, expect, it } from "vitest";
import { Variant } from "@custom-types/variant-types";
import { createDefaultVault } from "@shared/vault/default-vault";
import { render } from "@shared/variant/render";
import { initialState as cvDataState } from "@store/cv-data/cv-data-slice";
import {
  VariantsState,
  activeVariantSelector,
  addVariant,
  deleteVariant,
  duplicateVariant,
  initialState,
  relockVariants,
  renameVariant,
  setActiveVariant,
  setLocks,
  setPageLimit,
  unlockVariant,
  setBulletOrders,
  setBulletSelection,
  setItemOrders,
  setItemSelection,
  setVariantAppearance,
  setVariants,
  variantsReducer,
  variantsSelector,
} from "@store/variants/variants-slice";

/** The variants (job drawn with its template) of a slice state */
function all(state: VariantsState): Variant[] {
  return variantsSelector({ variants: state });
}

const vault = createDefaultVault();
const style = cvDataState.style;

function withTwo(): VariantsState {
  return variantsReducer(
    initialState,
    addVariant({ vault, style, name: "Second", id: "second" })
  );
}

describe("variants slice", () => {
  it("starts with one default variant that is active", () => {
    expect(all(initialState)).toHaveLength(1);
    expect(initialState.activeJobId).toBe(all(initialState)[0].id);
  });

  it("creates a variant, makes it active and gives it its own id", () => {
    const state = variantsReducer(
      initialState,
      addVariant({ vault, style, name: "Acme" })
    );

    expect(all(state)).toHaveLength(2);
    expect(all(state)[1].name).toBe("Acme");
    expect(all(state)[1].id).not.toBe(all(state)[0].id);
    expect(state.activeJobId).toBe(all(state)[1].id);
  });

  it("duplicates with new id and a default name, same render, independent data", () => {
    const state = variantsReducer(
      withTwo(),
      duplicateVariant({ sourceId: "second" })
    );
    const [, original, copy] = all(state);

    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe("Second (copy)");
    expect(render(vault, copy)).toEqual(render(vault, original));
    expect(copy.selection).not.toBe(original.selection);
    expect(state.activeJobId).toBe(copy.id);
  });

  it("ignores duplicating an unknown variant", () => {
    const state = variantsReducer(
      initialState,
      duplicateVariant({ sourceId: "nope" })
    );
    expect(all(state)).toHaveLength(1);
  });

  it("renames a variant", () => {
    const state = variantsReducer(
      withTwo(),
      renameVariant({ id: "second", name: "Renamed" })
    );
    expect(all(state)[1].name).toBe("Renamed");
  });

  it("deletes a variant and moves the active one", () => {
    const state = variantsReducer(withTwo(), deleteVariant({ id: "second" }));
    expect(all(state).map((v) => v.id)).toEqual([all(initialState)[0].id]);
    expect(state.activeJobId).toBe(all(initialState)[0].id);
  });

  it("never deletes the last variant", () => {
    const state = variantsReducer(
      initialState,
      deleteVariant({ id: all(initialState)[0].id })
    );
    expect(all(state)).toHaveLength(1);
  });

  it("only activates variants that exist", () => {
    const state = withTwo();
    const other = all(initialState)[0].id;
    expect(
      variantsReducer(state, setActiveVariant({ id: other })).activeJobId
    ).toBe(other);
    expect(
      variantsReducer(state, setActiveVariant({ id: "nope" })).activeJobId
    ).toBe("second");
  });

  it("hiding an item in one variant leaves the other and the vault alone", () => {
    const state = variantsReducer(
      withTwo(),
      setItemSelection({
        variantId: "second",
        itemId: "item-1",
        change: { isVisible: false },
      })
    );
    expect(all(state)[1].selection["item-1"]).toEqual({ isVisible: false });
    expect(all(state)[0].selection["item-1"]).toBeUndefined();
  });

  it("replaces all variants and keeps the active one valid", () => {
    const loaded = all(withTwo());
    const state = variantsReducer(
      { ...initialState, activeJobId: "gone" },
      setVariants(loaded)
    );
    expect(state.activeJobId).toBe(loaded[0].id);
    expect(all(variantsReducer(state, setVariants([])))).toHaveLength(1);
  });

  it("selects the active variant", () => {
    const state = withTwo();
    expect(activeVariantSelector({ variants: state }).id).toBe("second");
  });
});

describe("variants slice: bullets, order and appearance", () => {
  it("sets a bullet selection in one variant only", () => {
    const state = variantsReducer(
      withTwo(),
      setBulletSelection({
        variantId: "second",
        itemId: "i",
        bulletId: "b",
        change: { isVisible: false },
      })
    );
    expect(all(state)[1].selection.i.bullets?.b.isVisible).toBe(false);
    expect(all(state)[0].selection.i).toBeUndefined();
  });

  it("sets several item orders at once", () => {
    const state = variantsReducer(
      withTwo(),
      setItemOrders({ variantId: "second", orders: { a: 1, b: 0 } })
    );
    expect(all(state)[1].selection.a.order).toBe(1);
    expect(all(state)[1].selection.b.order).toBe(0);
    expect(all(state)[1].selection.a.isVisible).toBe(true);
  });

  it("stores layout and style in the variant", () => {
    const layout = { fullWidth: ["personalInfo"], left: [], right: [] };
    const state = variantsReducer(
      withTwo(),
      setVariantAppearance({
        id: "second",
        layout,
        style: { ...style, paperMargin: "narrow" },
      })
    );
    expect(all(state)[1].layout).toEqual(layout);
    expect(all(state)[1].style.paperMargin).toBe("narrow");
    expect(all(state)[0].layout).not.toEqual(layout);
  });
});

describe("variants slice: bullet order", () => {
  it("sets the order of several bullets in one variant only", () => {
    const state = variantsReducer(
      withTwo(),
      setBulletOrders({
        variantId: "second",
        itemId: "i",
        orders: { a: 1, b: 0 },
      })
    );
    const bullets = all(state)[1].selection.i.bullets;
    expect(bullets?.a).toEqual({ isVisible: true, order: 1 });
    expect(bullets?.b).toEqual({ isVisible: true, order: 0 });
    expect(all(state)[0].selection.i).toBeUndefined();
  });
});

describe("variant lock", () => {
  const sent = {
    byVariant: {
      second: [
        { applicationId: "a", company: "Acme", appliedAt: "2026-05-01" },
      ],
    },
    hasUnreadable: false,
  };

  function locked(): VariantsState {
    return variantsReducer(withTwo(), setLocks(sent));
  }

  it("ignores every change to a locked variant, even delete and rename", () => {
    let state = locked();
    state = variantsReducer(state, renameVariant({ id: "second", name: "X" }));
    state = variantsReducer(
      state,
      setPageLimit({ id: "second", pageLimit: 99 })
    );
    state = variantsReducer(state, deleteVariant({ id: "second" }));
    expect(all(state).map((v) => v.name)).toEqual(["Default", "Second"]);
    expect(all(state)[1].pageLimit).toBe(all(withTwo())[1].pageLimit);
  });

  it("still lets other variants change", () => {
    const state = variantsReducer(
      locked(),
      renameVariant({ id: "default", name: "Main" })
    );
    expect(all(state)[0].name).toBe("Main");
  });

  it("allows edits after an approved unlock, and locks again", () => {
    let state = variantsReducer(locked(), unlockVariant({ id: "second" }));
    state = variantsReducer(
      state,
      renameVariant({ id: "second", name: "New" })
    );
    expect(all(state)[1].name).toBe("New");
    state = variantsReducer(state, relockVariants({ ids: ["second"] }));
    state = variantsReducer(state, renameVariant({ id: "second", name: "Z" }));
    expect(all(state)[1].name).toBe("New");
  });

  it("drops an approval when the variant stops being locked", () => {
    let state = variantsReducer(locked(), unlockVariant({ id: "second" }));
    state = variantsReducer(
      state,
      setLocks({ byVariant: {}, hasUnreadable: false })
    );
    expect(state.unlockedIds).toEqual([]);
  });

  it("locks everything while an application file is damaged", () => {
    const state = variantsReducer(
      withTwo(),
      setLocks({ byVariant: {}, hasUnreadable: true })
    );
    expect(
      all(
        variantsReducer(state, renameVariant({ id: "default", name: "X" }))
      )[0].name
    ).toBe("Default");
  });

  it("lets new variants be created and loaded while others are locked", () => {
    let state = variantsReducer(
      locked(),
      duplicateVariant({ sourceId: "second", id: "copy" })
    );
    expect(all(state).map((v) => v.id)).toEqual(["default", "second", "copy"]);
    state = variantsReducer(state, setVariants([all(state)[2]]));
    expect(all(state)).toHaveLength(1);
  });
});
