import { getItemLabel } from "@shared/variant/item-label";
import {
  RenderedDocument,
  RenderedItem,
  RenderedSection,
} from "@shared/variant/render";

export type DiffStatus = "same" | "added" | "removed" | "changed";

/** A piece of a line: unchanged, inserted or deleted words */
export interface DiffPart {
  kind: "same" | "ins" | "del";
  text: string;
}

export interface DiffBullet {
  bulletId: string;
  status: DiffStatus;
  parts: DiffPart[];
}

export interface DiffItem {
  itemId: string;
  label: string;
  status: DiffStatus;

  /** Highlight (bold) switched on or off */
  emphasisChange?: "on" | "off";

  /** The item moved up or down within its section */
  isMoved: boolean;
  bullets: DiffBullet[];
}

export interface DiffSection {
  sectionId: string;
  title: string;

  /** The section's place in the order changed */
  isMoved: boolean;
  items: DiffItem[];
}

/** Words of a line with their trailing space, so joining the parts gives the line back */
function words(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

/** Word-level difference between two lines (longest common subsequence). Pure. */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = words(before);
  const b = words(after);
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        a[i].trim() === b[j].trim()
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const parts: DiffPart[] = [];
  function push(kind: DiffPart["kind"], text: string): void {
    const last = parts.at(-1);
    if (last?.kind === kind) {
      last.text += text;
    } else {
      parts.push({ kind, text });
    }
  }
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i].trim() === b[j].trim()) {
      push("same", b[j]);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push("del", a[i]);
      i += 1;
    } else {
      push("ins", b[j]);
      j += 1;
    }
  }
  while (i < a.length) {
    push("del", a[i]);
    i += 1;
  }
  while (j < b.length) {
    push("ins", b[j]);
    j += 1;
  }
  return parts;
}

function sectionsOf(document: RenderedDocument): RenderedSection[] {
  return (["fullWidth", "left", "right"] as const)
    .flatMap((side) => document.columns[side])
    .filter((part): part is RenderedSection => part.kind === "section");
}

function labelOf(item: RenderedItem): string {
  return getItemLabel({
    id: item.id,
    fields: item.fields,
    bullets: [],
    tags: [],
    shouldShow: true,
  });
}

function diffBullets(
  before: RenderedItem | undefined,
  after: RenderedItem | undefined
): DiffBullet[] {
  const result: DiffBullet[] = [];
  const old = new Map((before?.bullets ?? []).map((b) => [b.id, b.text]));
  for (const bullet of after?.bullets ?? []) {
    const previous = old.get(bullet.id);
    if (previous === undefined) {
      result.push({
        bulletId: bullet.id,
        status: before ? "added" : "same",
        parts: [{ kind: before ? "ins" : "same", text: bullet.text }],
      });
    } else if (previous === bullet.text) {
      result.push({
        bulletId: bullet.id,
        status: "same",
        parts: [{ kind: "same", text: bullet.text }],
      });
    } else {
      result.push({
        bulletId: bullet.id,
        status: "changed",
        parts: diffWords(previous, bullet.text),
      });
    }
    old.delete(bullet.id);
  }
  for (const [id, text] of old) {
    result.push({
      bulletId: id,
      status: "removed",
      parts: [{ kind: "del", text }],
    });
  }
  return result;
}

/**
 * What a proposal changes, section by section, in the order of the proposed CV: items and
 * bullets added or removed, wordings changed (word by word), highlights switched and
 * sections or items moved. Items that are only in `current` are listed as removed after
 * the items of the same section. Pure.
 */
export function diffDocuments(
  current: RenderedDocument,
  proposed: RenderedDocument
): DiffSection[] {
  const before = sectionsOf(current);
  const after = sectionsOf(proposed);
  const beforeOrder = before.map((s) => s.id);
  const afterOrder = after.map((s) => s.id);
  const sections = [
    ...after,
    ...before.filter((s) => !afterOrder.includes(s.id)),
  ];

  return sections.map((section) => {
    const was = before.find((s) => s.id === section.id);
    const is = after.find((s) => s.id === section.id);
    const wasItems = was?.items ?? [];
    const isItems = is?.items ?? [];
    const items: DiffItem[] = isItems.map((item, index) => {
      const old = wasItems.find((i) => i.id === item.id);
      const bullets = diffBullets(old, item);
      const hasBulletChange = bullets.some((b) => b.status !== "same");
      const emphasisChange =
        old && old.emphasis !== item.emphasis
          ? item.emphasis === "high"
            ? ("on" as const)
            : ("off" as const)
          : undefined;
      // moved: the relative order among items present in both changed
      const common = wasItems.filter((i) => isItems.some((x) => x.id === i.id));
      const commonAfter = isItems.filter((i) =>
        wasItems.some((x) => x.id === i.id)
      );
      return {
        itemId: item.id,
        label: labelOf(item),
        status: !old
          ? "added"
          : hasBulletChange || emphasisChange
            ? "changed"
            : "same",
        ...(emphasisChange ? { emphasisChange } : {}),
        isMoved:
          Boolean(old) &&
          common.findIndex((i) => i.id === item.id) !==
            commonAfter.findIndex((i) => i.id === item.id) &&
          index >= 0,
        bullets,
      };
    });
    for (const old of wasItems) {
      if (!isItems.some((i) => i.id === old.id)) {
        items.push({
          itemId: old.id,
          label: labelOf(old),
          status: "removed",
          isMoved: false,
          bullets: old.bullets.map((b) => ({
            bulletId: b.id,
            status: "removed",
            parts: [{ kind: "del", text: b.text }],
          })),
        });
      }
    }
    return {
      sectionId: section.id,
      title: section.title,
      isMoved:
        beforeOrder.includes(section.id) &&
        afterOrder.includes(section.id) &&
        beforeOrder.indexOf(section.id) !== afterOrder.indexOf(section.id),
      items,
    };
  });
}

/** True when the diff shows no change at all */
export function isDiffEmpty(diff: DiffSection[]): boolean {
  return diff.every(
    (section) =>
      !section.isMoved &&
      section.items.every((item) => item.status === "same" && !item.isMoved)
  );
}
