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
