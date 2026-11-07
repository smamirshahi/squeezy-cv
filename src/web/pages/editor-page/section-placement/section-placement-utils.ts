import { PageStructure } from "@store/app/app-slice-types";
import { Side } from "@custom-types/styles-types";
import { UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

const SIDES: Side[] = ["fullWidth", "left", "right"];

/** The column an `over` target means: a column itself, or the column a part sits in */
export function findTargetSide(
  structure: PageStructure,
  overId: UniqueIdentifier
): Side | null {
  return SIDES.includes(overId as Side)
    ? (overId as Side)
    : findItemSideById(structure, overId);
}

/**
 * While dragging: moves a part into another column, before the part it is over (or to the
 * end when over the empty column). Same-column moves are left for `reorderInColumn`.
 * Returns the same object when nothing changes.
 */
export function moveBetweenColumns(
  structure: PageStructure,
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier
): PageStructure {
  const from = findItemSideById(structure, activeId);
  const to = findTargetSide(structure, overId);
  if (!from || !to || from === to) {
    return structure;
  }
  const remaining = structure[from].filter((id) => id !== activeId);
  const target = [...structure[to]];
  const overIndex = target.indexOf(overId as string);
  target.splice(
    overIndex === -1 ? target.length : overIndex,
    0,
    activeId as string
  );
  return { ...structure, [from]: remaining, [to]: target };
}

/**
 * When dropped: puts the part where the part it is over is, in the same column.
 * Returns the same object when nothing changes.
 */
export function reorderInColumn(
  structure: PageStructure,
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier
): PageStructure {
  const side = findItemSideById(structure, activeId);
  if (!side || side !== findItemSideById(structure, overId)) {
    return structure;
  }
  const oldIndex = structure[side].indexOf(activeId as string);
  const newIndex = structure[side].indexOf(overId as string);
  if (oldIndex === newIndex) {
    return structure;
  }
  return {
    ...structure,
    [side]: arrayMove(structure[side], oldIndex, newIndex),
  };
}

export function findItemSideById(
  structure: PageStructure,
  id: UniqueIdentifier
): Side | null {
  for (const key of Object.keys(structure) as Side[]) {
    if (structure[key].some((itemId) => itemId === id)) {
      return key;
    }
  }
  return null;
}

/**
 * Moves a part one place up (-1) or down (+1) inside its column. Returns the same object
 * when it is already at that end or unknown.
 */
export function moveWithinColumn(
  structure: PageStructure,
  id: string,
  delta: -1 | 1
): PageStructure {
  const side = findItemSideById(structure, id);
  if (!side) {
    return structure;
  }
  const from = structure[side].indexOf(id);
  const to = from + delta;
  if (to < 0 || to >= structure[side].length) {
    return structure;
  }
  return { ...structure, [side]: arrayMove(structure[side], from, to) };
}

/** Moves a part to the end of another column. Returns the same object when nothing changes. */
export function moveToColumn(
  structure: PageStructure,
  id: string,
  side: Side
): PageStructure {
  const from = findItemSideById(structure, id);
  if (!from || from === side) {
    return structure;
  }
  return {
    ...structure,
    [from]: structure[from].filter((x) => x !== id),
    [side]: [...structure[side], id],
  };
}
