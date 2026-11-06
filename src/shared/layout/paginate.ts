/** A piece of the page that should not be split across two pages. Positions are in px from the top of the content area. */
export interface Block {
  top: number;
  height: number;

  /** The block must stay on the same page as the one after it (e.g. a heading) */
  shouldKeepWithNext: boolean;
}

export interface Pagination {
  /** How many pages the content needs, at least 1 */
  pageCount: number;

  /**
   * Where each page after the first starts, as a y position in the content as it is laid
   * out in one piece (the unbroken preview). Has `pageCount - 1` entries.
   */
  breaks: number[];

  /** Height of the content once groups pushed to the next page are counted, in px */
  totalHeight: number;
}

/** Tolerance for float rounding when comparing positions */
const EPSILON = 1e-6;

interface Group {
  top: number;
  bottom: number;
}

/** Joins blocks that have to stay together (a heading and what follows it) into one group */
function toGroups(blocks: Block[]): Group[] {
  const sorted = [...blocks].sort((a, b) => a.top - b.top);
  const groups: Group[] = [];
  let open: Group | null = null;
  for (const block of sorted) {
    const bottom = block.top + block.height;
    if (open) {
      open.bottom = Math.max(open.bottom, bottom);
    } else {
      open = { top: block.top, bottom };
    }
    if (!block.shouldKeepWithNext) {
      groups.push(open);
      open = null;
    }
  }
  if (open) {
    groups.push(open);
  }
  return groups;
}

/**
 * Works out where the pages break when the content is cut into pages of `pageHeight`
 * and no group of blocks may be split: a group that would cross a page end starts the next
 * page instead (the rest of that page stays empty). A group taller than a page cannot
 * be kept together and is allowed to split. Pure; only the measuring needs a browser.
 */
export function paginate(
  blocks: Block[],
  contentHeight: number,
  pageHeight: number
): Pagination {
  // Positions shift down by `shift` once a group has been pushed to the next page
  let shift = 0;
  const pushedStarts = new Map<number, number>();
  const shiftsAt: { effectiveTop: number; shift: number }[] = [];

  for (const group of toGroups(blocks)) {
    const top = group.top + shift;
    const bottom = group.bottom + shift;
    const page = Math.floor(top / pageHeight);
    const isTooTall = group.bottom - group.top > pageHeight;
    if (!isTooTall && Math.floor((bottom - EPSILON) / pageHeight) > page) {
      const nextPageStart = (page + 1) * pageHeight;
      shift += nextPageStart - top;
      pushedStarts.set(page + 1, group.top);
    }
    shiftsAt.push({ effectiveTop: group.top + shift, shift });
  }

  const pageCount = Math.max(
    1,
    Math.ceil((contentHeight + shift - EPSILON) / pageHeight)
  );

  const breaks: number[] = [];
  for (let page = 1; page < pageCount; page += 1) {
    const pushed = pushedStarts.get(page);
    if (pushed !== undefined) {
      breaks.push(pushed);
      continue;
    }
    // A natural break: undo the shift of the groups above it
    const y = page * pageHeight;
    const above = shiftsAt.filter((entry) => entry.effectiveTop <= y);
    const shiftHere = above.length > 0 ? above[above.length - 1].shift : 0;
    breaks.push(y - shiftHere);
  }
  return { pageCount, breaks, totalHeight: contentHeight + shift };
}
