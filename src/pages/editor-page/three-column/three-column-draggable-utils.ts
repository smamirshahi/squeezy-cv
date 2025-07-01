import { SectionId } from "@components/drag-and-drop/dnd-kit-types";
import { Side } from "@custom-types/styles-types";
import { UniqueIdentifier } from "@dnd-kit/core";

export interface Item {
  /** The ID of the item */
  id: SectionId;

  /** The label to show for each item */
  label: string;
}

export type PageStructure = Record<Side, Item[]>;

export const initialStructure: PageStructure = {
  fullWidth: [
    { id: "personalInfo", label: "Personal Info" },
    { id: "contactInfo", label: "Contact Info" },
    { id: "summary", label: "Personal Summary" },
  ],
  left: [{ id: "experiences", label: "Experiences" }],
  right: [
    { id: "educations", label: "Educations" },
    { id: "skills", label: "Skills" },
  ],
};

export function findItemSideById(
  structure: PageStructure,
  id: UniqueIdentifier
): Side | null {
  for (const key of Object.keys(structure) as Side[]) {
    if (structure[key].some((item) => item.id === id)) {
      return key;
    }
  }
  return null;
}
