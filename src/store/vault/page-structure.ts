import { Side } from "@custom-types/styles-types";

/** Which section ids sit in which column of the preview */
export type SectionColumns = Record<Side, string[]>;

const SIDES: Side[] = ["fullWidth", "left", "right"];

/**
 * Makes the page structure consistent with the sections that exist: ids that no
 * longer exist (e.g. a deleted section) and duplicates are dropped, and ids that are
 * not placed yet (e.g. a new section) are appended to `defaultSide` in `validIds`
 * order. Existing placement and order are otherwise kept. Returns a new object.
 */
export function reconcileStructure(
  structure: SectionColumns,
  validIds: string[],
  defaultSide: Side = "left"
): SectionColumns {
  const valid = new Set(validIds);
  const seen = new Set<string>();
  const result: SectionColumns = { fullWidth: [], left: [], right: [] };

  for (const side of SIDES) {
    for (const id of structure[side]) {
      if (valid.has(id) && !seen.has(id)) {
        seen.add(id);
        result[side].push(id);
      }
    }
  }

  for (const id of validIds) {
    if (!seen.has(id)) {
      seen.add(id);
      result[defaultSide].push(id);
    }
  }

  return result;
}
