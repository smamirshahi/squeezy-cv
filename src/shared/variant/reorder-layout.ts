import { VariantLayout } from "@custom-types/variant-types";

/**
 * Puts the section ids of each column in the relative order of `order`. Header parts and
 * sections not in `order` keep their places. Pure.
 */
export function reorderLayoutSections(
  layout: VariantLayout,
  order: string[]
): VariantLayout {
  const rank = new Map(order.map((id, index) => [id, index]));
  function sortColumn(ids: string[]): string[] {
    const slots = ids
      .map((id, index) => (rank.has(id) ? index : -1))
      .filter((index) => index >= 0);
    const sorted = slots
      .map((index) => ids[index])
      .sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
    const result = [...ids];
    slots.forEach((slot, position) => {
      result[slot] = sorted[position];
    });
    return result;
  }
  return {
    fullWidth: sortColumn(layout.fullWidth),
    left: sortColumn(layout.left),
    right: sortColumn(layout.right),
  };
}
