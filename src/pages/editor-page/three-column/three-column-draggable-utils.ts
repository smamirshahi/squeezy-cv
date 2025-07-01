import { SectionId } from "@components/drag-and-drop/dnd-kit-types";
import { Side } from "@custom-types/styles-types";

export interface Item {
  /** The ID of the item */
  id: SectionId;

  /** The label to show for each item */
  label: string;
}

export const initialStructure: Record<Side, Item[]> = {
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
