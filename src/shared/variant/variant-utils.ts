import { DEFAULT_PAGE_LIMIT } from "@custom-types/job-types";
import { Style } from "@custom-types/styles-types";
import {
  BulletSelection,
  CURRENT_VARIANT_VERSION,
  GeneratedBullet,
  ItemSelection,
  Variant,
} from "@custom-types/variant-types";
import { CvFile, Item, Vault } from "@custom-types/vault-types";
import {
  sortBulletsByVariant,
  sortItemsByVariant,
} from "@shared/variant/render";
import { singleColumnLayout } from "@shared/vault/page-structure";

/** Anything with per-item choices: a variant or a job */
interface HasSelection {
  selection: Variant["selection"];
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
    layout: singleColumnLayout(vault.sections),
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
export function copyJob(variant: Variant, id: string, name: string): Variant {
  return { ...structuredClone(variant), id, name };
}

/** Changes one item's selection (merged with what is there) and returns a new variant */
export function updateItemSelection<T extends HasSelection>(
  variant: T,
  itemId: string,
  change: Partial<ItemSelection>
): T {
  const current = variant.selection[itemId] ?? { isVisible: true };
  return {
    ...variant,
    selection: { ...variant.selection, [itemId]: { ...current, ...change } },
  };
}

/**
 * The `order` values that put `id` at `toIndex` in `ids` (the current order). Every id
 * gets a value; an unknown id changes nothing.
 */
export function computeOrders(
  ids: string[],
  id: string,
  toIndex: number
): Record<string, number> {
  const list = [...ids];
  const from = list.indexOf(id);
  if (from < 0) {
    return {};
  }
  list.splice(from, 1);
  list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, id);
  return Object.fromEntries(list.map((entry, index) => [entry, index]));
}

/** `computeOrders` for the items of a section, as the variant shows them (hidden ones included) */
export function computeItemOrders(
  items: Item[],
  variant: Variant,
  itemId: string,
  toIndex: number
): Record<string, number> {
  return computeOrders(
    sortItemsByVariant(items, variant.selection).map((i) => i.id),
    itemId,
    toIndex
  );
}

/** `computeOrders` for the bullets of an item, as the variant shows them (hidden ones included) */
export function computeBulletOrders(
  item: Item,
  variant: Variant,
  bulletId: string,
  toIndex: number
): Record<string, number> {
  return computeOrders(
    sortBulletsByVariant(item, variant.selection).map((b) => b.id),
    bulletId,
    toIndex
  );
}

/** Changes one bullet's selection (merged with what is there) and returns a new variant */
export function updateBulletSelection<T extends HasSelection>(
  variant: T,
  itemId: string,
  bulletId: string,
  change: Partial<BulletSelection>
): T {
  const item = variant.selection[itemId] ?? { isVisible: true };
  const current = item.bullets?.[bulletId] ?? { isVisible: true };
  return updateItemSelection(variant, itemId, {
    bullets: { ...item.bullets, [bulletId]: { ...current, ...change } },
  });
}

/**
 * The change of an item's selection that sets its generated bullets (`undefined` or an empty
 * list = back to the vault's bullets). Choices made on the bullets being replaced are dropped.
 */
export function generatedBulletsChange(
  current: ItemSelection | undefined,
  next: GeneratedBullet[] | undefined
): Partial<ItemSelection> {
  const replaced = new Set((current?.generated ?? []).map((b) => b.id));
  const kept = Object.fromEntries(
    Object.entries(current?.bullets ?? {}).filter(([id]) => !replaced.has(id))
  );
  return {
    generated: next && next.length > 0 ? next : undefined,
    bullets: Object.keys(kept).length > 0 ? kept : undefined,
  };
}
