import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { Variant } from "@custom-types/variant-types";
import { Vault } from "@custom-types/vault-types";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import {
  render,
  RenderedPart,
  sortItemsByVariant,
} from "@shared/variant/render";
import {
  createDefaultVariant,
  computeItemOrders,
  createVariant,
  duplicateVariant,
  updateBulletSelection,
  updateItemSelection,
} from "@shared/variant/variant-utils";

const file = migrateCvFile(sample);
const vault: Vault = file.vault;

function sectionPart(
  parts: RenderedPart[],
  id: string
): Extract<RenderedPart, { kind: "section" }> | undefined {
  return parts.find(
    (part): part is Extract<RenderedPart, { kind: "section" }> =>
      part.kind === "section" && part.id === id
  );
}

function allParts(doc: ReturnType<typeof render>): RenderedPart[] {
  return [...doc.columns.fullWidth, ...doc.columns.left, ...doc.columns.right];
}

function sectionWithBullets(): {
  section: Vault["sections"][number];
  item: Vault["sections"][number]["items"][number];
} {
  for (const section of vault.sections) {
    const item = section.items.find((i) => i.bullets.length > 0);
    if (item) {
      return { section, item };
    }
  }
  throw new Error("fixture needs an item with bullets");
}

function firstSectionWithItems(count: number): Vault["sections"][number] {
  const section = vault.sections.find((s) => s.items.length >= count);
  if (!section) {
    throw new Error("fixture needs a section with enough items");
  }
  return section;
}

function base(): Variant {
  return createVariant(vault, file.style, "v1", "Base");
}

describe("render", () => {
  it("shows every item in vault order by default and keeps the header", () => {
    const doc = render(vault, base());
    const section = firstSectionWithItems(2);
    const rendered = sectionPart(allParts(doc), section.id);

    expect(rendered?.items.map((i) => i.id)).toEqual(
      section.items.filter((i) => i.shouldShow).map((i) => i.id)
    );
    expect(doc.columns.fullWidth[0].kind).toBe("personalInfo");
    expect(doc.columns.fullWidth[1].kind).toBe("contactInfo");
  });

  it("hides items hidden in the variant without touching the vault", () => {
    const section = firstSectionWithItems(2);
    const hiddenId = section.items[0].id;
    const before = JSON.stringify(vault);
    const variant = updateItemSelection(base(), hiddenId, { isVisible: false });

    const rendered = sectionPart(allParts(render(vault, variant)), section.id);

    expect(rendered?.items.map((i) => i.id)).not.toContain(hiddenId);
    expect(JSON.stringify(vault)).toBe(before);
  });

  it("orders items by their order value, unordered ones after", () => {
    const section = firstSectionWithItems(2);
    const [first, second] = section.items;
    const variant = updateItemSelection(base(), second.id, {
      isVisible: true,
      order: 0,
    });

    const ids = sectionPart(
      allParts(render(vault, variant)),
      section.id
    )?.items.map((i) => i.id);

    expect(ids?.[0]).toBe(second.id);
    expect(ids).toContain(first.id);
  });

  it("uses the chosen wording and falls back to text when it is missing", () => {
    const { section, item } = sectionWithBullets();
    const bullet = item.bullets[0];
    const customVault: Vault = structuredClone(vault);
    const target = customVault.sections
      .flatMap((s) => s.items)
      .find((i) => i.id === item.id);
    if (!target) {
      throw new Error("item missing");
    }
    target.bullets[0].alt = { short: "SHORT" };

    function pick(wording: "short" | "long"): string | undefined {
      return sectionPart(
        allParts(
          render(
            customVault,
            updateItemSelection(base(), item.id, {
              isVisible: true,
              bullets: { [bullet.id]: { isVisible: true, wording } },
            })
          )
        ),
        section.id
      )
        ?.items.find((i) => i.id === item.id)
        ?.bullets.find((b) => b.id === bullet.id)?.text;
    }

    expect(pick("short")).toBe("SHORT");
    expect(pick("long")).toBe(bullet.text);
  });

  it("hides a single bullet", () => {
    const { section, item } = sectionWithBullets();
    const variant = updateItemSelection(base(), item.id, {
      isVisible: true,
      bullets: { [item.bullets[0].id]: { isVisible: false } },
    });

    const rendered = sectionPart(
      allParts(render(vault, variant)),
      section.id
    )?.items.find((i) => i.id === item.id);

    expect(rendered?.bullets.map((b) => b.id)).not.toContain(
      item.bullets[0].id
    );
    expect(rendered?.bullets.length).toBe(item.bullets.length - 1);
  });

  it("leaves out sections with no visible item and drops unknown layout ids", () => {
    const section = firstSectionWithItems(1);
    let variant = base();
    for (const item of section.items) {
      variant = updateItemSelection(variant, item.id, { isVisible: false });
    }
    variant = {
      ...variant,
      layout: { ...variant.layout, right: [...variant.layout.right, "gone"] },
    };

    const parts = allParts(render(vault, variant));

    expect(sectionPart(parts, section.id)).toBeUndefined();
    expect(parts.some((p) => p.id === "gone")).toBe(false);
  });

  it("places a section that is missing from the layout", () => {
    const variant = {
      ...base(),
      layout: { fullWidth: [], left: [], right: [] },
    };
    const ids = allParts(render(vault, variant)).map((p) => p.id);
    expect(ids).toContain("personalInfo");
  });

  it("gives a duplicate new ids but the same output", () => {
    const original = updateItemSelection(
      base(),
      firstSectionWithItems(1).items[0].id,
      { isVisible: false }
    );
    const copy = duplicateVariant(original, "v2", "Copy");

    expect(copy.id).toBe("v2");
    expect(copy.name).toBe("Copy");
    expect(render(vault, copy)).toEqual(render(vault, original));

    // independent: changing the copy leaves the original alone
    const changed = updateItemSelection(copy, "x", { isVisible: false });
    expect(original.selection.x).toBeUndefined();
    expect(changed.selection.x).toBeDefined();
  });

  it("does not change its input and is repeatable", () => {
    const variant = base();
    const snapshot = JSON.stringify([vault, variant]);
    expect(render(vault, variant)).toEqual(render(vault, variant));
    expect(JSON.stringify([vault, variant])).toBe(snapshot);
  });
});

describe("createDefaultVariant", () => {
  it("hides what was hidden in the file and takes style and title from it", () => {
    const hidden = structuredClone(file);
    const item = hidden.vault.sections.flatMap((s) => s.items)[0];
    item.shouldShow = false;

    const variant = createDefaultVariant(hidden, "main");

    expect(variant.selection[item.id]).toEqual({ isVisible: false });
    expect(variant.style).toEqual(file.style);
    expect(variant.name).toBe(file.metaData.title || "Default");
    expect(
      allParts(render(hidden.vault, variant)).flatMap((p) =>
        p.kind === "section" ? p.items.map((i) => i.id) : []
      )
    ).not.toContain(item.id);
  });

  it("uses the given layout", () => {
    const layout = { fullWidth: ["personalInfo"], left: [], right: [] };
    expect(createDefaultVariant(file, "main", layout).layout).toEqual(layout);
  });
});

describe("computeItemOrders", () => {
  it("moves an item to a position and numbers all items of the section", () => {
    const section = firstSectionWithItems(2);
    const ids = section.items.map((i) => i.id);
    const last = ids[ids.length - 1];

    const orders = computeItemOrders(section.items, base(), last, 0);

    expect(Object.keys(orders).sort()).toEqual([...ids].sort());
    expect(orders[last]).toBe(0);

    let variant = base();
    for (const [id, order] of Object.entries(orders)) {
      variant = updateItemSelection(variant, id, { order });
    }
    expect(sortItemsByVariant(section.items, variant.selection)[0].id).toBe(
      last
    );
  });

  it("ignores unknown items and clamps the position", () => {
    const section = firstSectionWithItems(2);
    expect(computeItemOrders(section.items, base(), "nope", 0)).toEqual({});
    const first = section.items[0].id;
    expect(computeItemOrders(section.items, base(), first, 99)[first]).toBe(
      section.items.length - 1
    );
  });
});

describe("updateBulletSelection", () => {
  it("merges into the existing choice without changing the input", () => {
    const original = base();
    const next = updateBulletSelection(original, "i", "b", {
      wording: "short",
    });
    const again = updateBulletSelection(next, "i", "b", { isVisible: false });

    expect(next.selection.i.bullets?.b).toEqual({
      isVisible: true,
      wording: "short",
    });
    expect(again.selection.i.bullets?.b).toEqual({
      isVisible: false,
      wording: "short",
    });
    expect(original.selection.i).toBeUndefined();
  });
});
