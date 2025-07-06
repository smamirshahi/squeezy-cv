import { PageStructure, PreviewSectionId } from "@store/app/app-slice-types";
import { Side } from "@custom-types/styles-types";
import { UniqueIdentifier } from "@dnd-kit/core";
import { CSS, Transform } from "@dnd-kit/utilities";

export const initialPlacement: PageStructure = {
  fullWidth: ["personalInfo", "contactInfo", "summary"],
  left: ["experiences"],
  right: ["educations", "skills"],
};

export function getLabelById(id: PreviewSectionId): string {
  switch (id) {
    case "personalInfo":
      return "Personal Info";
    case "contactInfo":
      return "Contact Info";
    case "summary":
      return "Personal Summary";
    case "experiences":
      return "Experiences";
    case "educations":
      return "Educations";
    case "skills":
      return "Skills";
  }
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
