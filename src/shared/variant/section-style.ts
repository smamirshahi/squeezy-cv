import {
  SECTION_STYLE_RANGES,
  SectionStyle,
} from "@custom-types/variant-types";
import { normaliseHex } from "@shared/style/typography-utils";

function clamp(value: number, range: { min: number; max: number }): number {
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

/** A change of a section style: a key set to null (or an empty colour) goes back to the global style */
export type SectionStyleChange = {
  [K in keyof SectionStyle]?: SectionStyle[K] | null;
};

/**
 * Applies a change to a section style. Numbers are rounded and kept in range, an invalid
 * colour is ignored. Returns undefined when nothing is left (so the entry can be removed).
 */
export function changeSectionStyle(
  current: SectionStyle | undefined,
  change: SectionStyleChange
): SectionStyle | undefined {
  const next: SectionStyle = { ...current };
  if ("headingSize" in change) {
    if (change.headingSize == null || !Number.isFinite(change.headingSize)) {
      delete next.headingSize;
    } else {
      next.headingSize = clamp(
        change.headingSize,
        SECTION_STYLE_RANGES.headingSize
      );
    }
  }
  if ("spaceAbove" in change) {
    if (change.spaceAbove == null || !Number.isFinite(change.spaceAbove)) {
      delete next.spaceAbove;
    } else {
      next.spaceAbove = clamp(
        change.spaceAbove,
        SECTION_STYLE_RANGES.spaceAbove
      );
    }
  }
  if ("headingColor" in change) {
    const hex =
      change.headingColor == null
        ? undefined
        : normaliseHex(change.headingColor);
    if (hex) {
      next.headingColor = hex;
    } else if (change.headingColor == null || change.headingColor === "") {
      delete next.headingColor;
    }
  }
  if ("showDivider" in change) {
    if (change.showDivider == null) {
      delete next.showDivider;
    } else {
      next.showDivider = change.showDivider;
    }
  }
  return Object.keys(next).length === 0 ? undefined : next;
}
