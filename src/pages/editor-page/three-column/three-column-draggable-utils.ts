import { SectionId } from "@components/drag-and-drop/dnd-kit-types";

export interface Item {
  /** The ID of the item */
  id: SectionId;

  /** The label to show for each item */
  label: string;
}
