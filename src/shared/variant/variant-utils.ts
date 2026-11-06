import { Style } from "@custom-types/styles-types";
import {
  BulletSelection,
  CURRENT_VARIANT_VERSION,
  ItemSelection,
  Variant,
} from "@custom-types/variant-types";
import { CvFile, Item, Vault } from "@custom-types/vault-types";
import { HEADER_IDS } from "@shared/vault/default-vault";
import { sortItemsByVariant } from "@shared/variant/render";
import { reconcileStructure } from "@shared/vault/page-structure";

const DEFAULT_PAGE_LIMIT = 2;

/** The standard column placement for the given sections: header on top, one column for the rest */
function defaultLayout(vault: Vault): Variant["layout"] {
  const sectionIds = vault.sections.map((section) => section.id);
  return reconcileStructure(
    { fullWidth: [...HEADER_IDS], left: [], right: [] },
    [...HEADER_IDS, ...sectionIds],
    "left"
  );
}

/** Items hidden in the vault (`shouldShow: false`) are hidden in the variant too */
function selectionFromVault(vault: Vault): Variant["selection"] {
  const selection: Variant["selection"] = {};
  for (const section of vault.sections) {
    for (const item of section.items) {
      if (!item.shouldShow) {
        selection[item.id] = { isVisible: false };
      }
    }
  }
  return selection;
}

/** A new variant that shows everything the vault shows */
export function createVariant(
  vault: Vault,
  style: Style,
  id: string,
  name: string
): Variant {
  return {
    id,
    version: CURRENT_VARIANT_VERSION,
    name,
    tone: "neutral",
    pageLimit: DEFAULT_PAGE_LIMIT,
    layout: defaultLayout(vault),
    selection: selectionFromVault(vault),
    style,
  };
}

/**
 * Turns a CV file (vault + style) into its first variant, so existing data keeps
 * rendering the way it did. `layout` is the page structure the file was edited with.
 */
export function createDefaultVariant(
  file: CvFile,
  id: string,
  layout?: Variant["layout"]
): Variant {
  const variant = createVariant(
    file.vault,
    file.style,
    id,
    file.metaData.title || "Default"
  );
  return layout ? { ...variant, layout } : variant;
}

/** A copy with a new id and name. Nothing is shared with the original. */
export function duplicateVariant(
  variant: Variant,
  id: string,
  name: string
): Variant {
  return { ...structuredClone(variant), id, name };
}

/** Changes one item's selection (merged with what is there) and returns a new variant */
export function updateItemSelection(
  variant: Variant,
  itemId: string,
  change: Partial<ItemSelection>
): Variant {
  const current = variant.selection[itemId] ?? { isVisible: true };
  return {
    ...variant,
    selection: { ...variant.selection, [itemId]: { ...current, ...change } },
  };
}

/**
 * The `order` values that put `itemId` at `toIndex` among the items of a section, as the
 * variant shows them (hidden ones included). Every item of the section gets a value.
 */
export function computeItemOrders(
  items: Item[],
  variant: Variant,
  itemId: string,
  toIndex: number
): Record<string, number> {
  const ids = sortItemsByVariant(items, variant.selection).map((i) => i.id);
  const from = ids.indexOf(itemId);
  if (from < 0) {
    return {};
  }
  ids.splice(from, 1);
  ids.splice(Math.max(0, Math.min(toIndex, ids.length)), 0, itemId);
  return Object.fromEntries(ids.map((id, index) => [id, index]));
}

/** Changes one bullet's selection (merged with what is there) and returns a new variant */
export function updateBulletSelection(
  variant: Variant,
  itemId: string,
  bulletId: string,
  change: Partial<BulletSelection>
): Variant {
  const item = variant.selection[itemId] ?? { isVisible: true };
  const current = item.bullets?.[bulletId] ?? { isVisible: true };
  return updateItemSelection(variant, itemId, {
    bullets: { ...item.bullets, [bulletId]: { ...current, ...change } },
  });
}
