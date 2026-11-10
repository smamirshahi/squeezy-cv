import {
  isLanguageGroup,
  languageLevelLabel,
} from "@shared/vault/skill-suggestions";
import { Bullet, Item, Section, Vault } from "@custom-types/vault-types";

/**
 * Moves the element at `from` to position `to` (clamped to the valid range).
 * Mutates and returns the array; use inside Immer reducers or on a copy.
 */
export function moveInArray<T>(array: T[], from: number, to: number): T[] {
  if (from < 0 || from >= array.length) {
    return array;
  }
  const [element] = array.splice(from, 1);
  array.splice(Math.max(0, Math.min(to, array.length)), 0, element);
  return array;
}

/** Section types whose items are kept in date order by the vault */
const DATED_TYPES: Section["type"][] = [
  "experience",
  "education",
  "publications",
  "awards",
];

/** The year of an item: the first four digits of its year, date or start date (null when it has none) */
export function itemYear(item: Item): number | null {
  const text =
    item.fields.year || item.fields.date || item.fields.startDate || "";
  const match = /\b(\d{4})\b/.exec(text);
  return match ? Number(match[1]) : null;
}

/** Items by year, newest first (items without a year last; ties keep their order). Returns a new array. */
function sortItemsByYear(items: Item[]): Item[] {
  return [...items].sort(
    (a, b) =>
      (itemYear(b) ?? Number.NEGATIVE_INFINITY) -
        (itemYear(a) ?? Number.NEGATIVE_INFINITY) || 0
  );
}

/** Keeps the right order for the section type: by year for publications and awards, else by date */
function sortItemsFor(section: Section): Item[] {
  return section.type === "publications" || section.type === "awards"
    ? sortItemsByYear(section.items)
    : sortItemsByDate(section.items);
}

/** Sorts a dated item's date as a comparable number: an empty end date means "current" */
function dateValue(iso: string | undefined, isEnd: boolean): number {
  const time = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(time)) {
    return isEnd ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  return time;
}

/**
 * Items newest first: by end date (no end date = current = first), then by start date.
 * Items that tie keep their order. Returns a new array.
 */
function sortItemsByDate(items: Item[]): Item[] {
  return [...items].sort(
    (a, b) =>
      dateValue(b.fields.endDate, true) - dateValue(a.fields.endDate, true) ||
      dateValue(b.fields.startDate, false) -
        dateValue(a.fields.startDate, false)
  );
}

/** The section with its items in date order (same object when it needs none or has no dates) */
export function sortedSection(section: Section): Section {
  if (!DATED_TYPES.includes(section.type)) {
    return section;
  }
  const items = sortItemsFor(section);
  return items.every((item, index) => item === section.items[index])
    ? section
    : { ...section, items };
}

/**
 * The vault with work experience and education in date order. Returns the same object when
 * nothing has to move (editors compare the vault by reference to see unapplied changes).
 */
export function withDatedSectionsSorted(vault: Vault): Vault {
  const sections = vault.sections.map(sortedSection);
  return sections.every((section, index) => section === vault.sections[index])
    ? vault
    : { ...vault, sections };
}

/** Puts the items of a work experience or education section in date order (in place) */
export function keepInDateOrder(section: Section | undefined): void {
  if (section && DATED_TYPES.includes(section.type)) {
    section.items = sortItemsFor(section);
  }
}

/** Trims tags, drops empty ones and duplicates (case-insensitive), keeps first spelling and order */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      result.push(tag);
    }
  }
  return result;
}

export function findSection(
  vault: Vault,
  sectionId: string
): Section | undefined {
  return vault.sections.find((s) => s.id === sectionId);
}

export function findItem(
  vault: Vault,
  sectionId: string,
  itemId: string
): Item | undefined {
  return findSection(vault, sectionId)?.items.find((i) => i.id === itemId);
}

export function findBullet(
  vault: Vault,
  sectionId: string,
  itemId: string,
  bulletId: string
): Bullet | undefined {
  return findItem(vault, sectionId, itemId)?.bullets.find(
    (b) => b.id === bulletId
  );
}

/**
 * Turns an edited list of bullet texts back into bullets. Bullets are matched by
 * position: an existing bullet keeps its id, tags, alternative wordings and rating when
 * only its text changes; extra texts get new bullets; missing texts drop the last ones.
 */
export function replaceBulletTexts(
  bullets: Bullet[],
  texts: string[],
  newId: () => string
): Bullet[] {
  return texts.map((text, index) => {
    const existing = bullets[index];
    return existing ? { ...existing, text } : { id: newId(), text, tags: [] };
  });
}

/** Whether a number of years is acceptable: a whole number from 0 to 80 */
export function isYearsAcceptable(years: number): boolean {
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  return Number.isInteger(years) && years >= 0 && years <= 80;
}

/** The name of a level (a rating in steps of 0.5; halves are named by the whole level below) */
export function levelLabel(
  rating: number | undefined,
  category?: string
): string {
  if (isLanguageGroup(category)) {
    return languageLevelLabel(rating);
  }
  const labels = ["No level", "Learning", "Working", "Proficient", "Advanced"];
  if (!rating) {
    return labels[0];
  }
  return labels[Math.floor(rating)] ?? "Expert";
}
