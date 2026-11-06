import { PageStructure } from "@store/app/app-slice-types";
import { Side } from "@custom-types/styles-types";
import { UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { CSS, Transform } from "@dnd-kit/utilities";

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

/** Style used for each sortable column. Mirrors the look from the dnd-kit example */
export const columnStyle: React.CSSProperties = {
  background: "#f9f9f9",
  padding: "8px",
  border: "2px dashed #ccc",
  borderRadius: "4px",
  minHeight: "120px",
  width: "200px",
};

/**
 * Returns the style for individual sortable items. The transform and
 * transition are provided by dnd-kit.
 */
export function getItemStyle(
  transform: Transform | null,
  transition: string | undefined,
  isDragging: boolean
): React.CSSProperties {
  return {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "8px",
    margin: "4px 0",
    background: isDragging ? "#cce5ff" : "#fff",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "grab",
  };
}
