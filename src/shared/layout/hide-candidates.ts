import { Variant } from "@custom-types/variant-types";
import { Vault } from "@custom-types/vault-types";
import { getItemLabel } from "@shared/variant/item-label";

/** Relevance assumed for an item that tailoring has not scored */
const UNKNOWN_RELEVANCE = 50;

export interface HideCandidate {
  itemId: string;
  sectionId: string;
  sectionTitle: string;
  label: string;
  relevance: number;
  isHidden: boolean;
}

/**
 * The items that could be hidden to gain space, least relevant first. Items without a score
 * count as `UNKNOWN_RELEVANCE`; among equals the later item (usually the older one) comes
 * first. The summary is never offered. Pure.
 */
export function rankHideCandidates(
  vault: Vault,
  variant: Variant
): HideCandidate[] {
  const all: (HideCandidate & { index: number })[] = [];
  let index = 0;
  for (const section of vault.sections) {
    if (section.type === "summary") {
      continue;
    }
    for (const item of section.items) {
      const choice = variant.selection[item.id];
      all.push({
        itemId: item.id,
        sectionId: section.id,
        sectionTitle: section.title,
        label: getItemLabel(item),
        relevance: choice?.relevance ?? UNKNOWN_RELEVANCE,
        isHidden: choice?.isVisible === false,
        index,
      });
      index += 1;
    }
  }
  return all
    .sort((a, b) => a.relevance - b.relevance || b.index - a.index)
    .map(({ index: _index, ...candidate }) => candidate);
}

/**
 * The fewest items, taken in the given order from the visible ones, whose measured line
 * counts add up to at least `linesNeeded`. Returns what it found even when that is not
 * enough (the caller can say it still does not fit).
 */
export function pickItemsToHide(
  candidates: HideCandidate[],
  linesOf: (itemId: string) => number,
  linesNeeded: number
): string[] {
  const picked: string[] = [];
  let gained = 0;
  for (const candidate of candidates) {
    if (gained >= linesNeeded) {
      break;
    }
    const lines = candidate.isHidden ? 0 : linesOf(candidate.itemId);
    if (lines > 0) {
      picked.push(candidate.itemId);
      gained += lines;
    }
  }
  return picked;
}
