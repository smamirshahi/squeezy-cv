import { describe, expect, it } from "vitest";
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
  renameVariant,
  setActiveVariant,
  setBulletSelection,
  setItemOrders,
  setItemSelection,
  setVariantAppearance,
  setVariants,
  variantsReducer,
} from "@store/variants/variants-slice";

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
    expect(initialState.variants).toHaveLength(1);
    expect(initialState.activeId).toBe(initialState.variants[0].id);
  });

  it("creates a variant, makes it active and gives it its own id", () => {
    const state = variantsReducer(
      initialState,
      addVariant({ vault, style, name: "Acme" })
    );

    expect(state.variants).toHaveLength(2);
    expect(state.variants[1].name).toBe("Acme");
    expect(state.variants[1].id).not.toBe(state.variants[0].id);
    expect(state.activeId).toBe(state.variants[1].id);
  });

  it("duplicates with new id and a default name, same render, independent data", () => {
    const state = variantsReducer(
      withTwo(),
      duplicateVariant({ sourceId: "second" })
    );
    const [, original, copy] = state.variants;

    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe("Second (copy)");
    expect(render(vault, copy)).toEqual(render(vault, original));
    expect(copy.selection).not.toBe(original.selection);
    expect(state.activeId).toBe(copy.id);
  });

  it("ignores duplicating an unknown variant", () => {
    const state = variantsReducer(
      initialState,
      duplicateVariant({ sourceId: "nope" })
    );
    expect(state.variants).toHaveLength(1);
  });

  it("renames a variant", () => {
    const state = variantsReducer(
      withTwo(),
      renameVariant({ id: "second", name: "Renamed" })
    );
    expect(state.variants[1].name).toBe("Renamed");
  });

  it("deletes a variant and moves the active one", () => {
    const state = variantsReducer(withTwo(), deleteVariant({ id: "second" }));
    expect(state.variants.map((v) => v.id)).toEqual([
      initialState.variants[0].id,
    ]);
    expect(state.activeId).toBe(initialState.variants[0].id);
  });

  it("never deletes the last variant", () => {
    const state = variantsReducer(
      initialState,
      deleteVariant({ id: initialState.variants[0].id })
    );
    expect(state.variants).toHaveLength(1);
  });

  it("only activates variants that exist", () => {
    const state = withTwo();
    const other = initialState.variants[0].id;
    expect(
      variantsReducer(state, setActiveVariant({ id: other })).activeId
    ).toBe(other);
    expect(
      variantsReducer(state, setActiveVariant({ id: "nope" })).activeId
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
    expect(state.variants[1].selection["item-1"]).toEqual({ isVisible: false });
    expect(state.variants[0].selection["item-1"]).toBeUndefined();
  });

  it("replaces all variants and keeps the active one valid", () => {
    const loaded = withTwo().variants;
    const state = variantsReducer(
      { ...initialState, activeId: "gone" },
      setVariants(loaded)
    );
    expect(state.activeId).toBe(loaded[0].id);
    expect(variantsReducer(state, setVariants([])).variants).toHaveLength(1);
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
    expect(state.variants[1].selection.i.bullets?.b.isVisible).toBe(false);
    expect(state.variants[0].selection.i).toBeUndefined();
  });

  it("sets several item orders at once", () => {
    const state = variantsReducer(
      withTwo(),
      setItemOrders({ variantId: "second", orders: { a: 1, b: 0 } })
    );
    expect(state.variants[1].selection.a.order).toBe(1);
    expect(state.variants[1].selection.b.order).toBe(0);
    expect(state.variants[1].selection.a.isVisible).toBe(true);
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
    expect(state.variants[1].layout).toEqual(layout);
    expect(state.variants[1].style.paperMargin).toBe("narrow");
    expect(state.variants[0].layout).not.toEqual(layout);
  });
});
