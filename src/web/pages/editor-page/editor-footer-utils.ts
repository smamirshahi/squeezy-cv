import { Section } from "@custom-types/vault-types";

/** Pages of the editor that change nothing in the CV data, so they have no Apply/Discard */
const PAGES_WITHOUT_APPLY = [
  "styleSettings",
  "pageStructure",
  "sections",
  "variants",
];

const ADD_LABELS: Partial<Record<Section["type"], string>> = {
  experience: "Add new experience",
  education: "Add new education",
  skills: "Add new skill category",
  projects: "Add new item",
  certifications: "Add new item",
  publications: "Add new item",
  volunteering: "Add new item",
  custom: "Add new item",
};

/** What the editor footer shows for the selected editor page */
export function getAddButtonLabel(
  selectedPageId: string,
  sections: Section[]
): { shouldShowApplyButton: boolean; addNewItemButtonLabel: string } {
  if (PAGES_WITHOUT_APPLY.includes(selectedPageId)) {
    return { shouldShowApplyButton: false, addNewItemButtonLabel: "" };
  }
  if (selectedPageId === "mainInfo") {
    return {
      shouldShowApplyButton: true,
      addNewItemButtonLabel: "Add new link",
    };
  }
  const section = sections.find((s) => s.id === selectedPageId);
  return {
    shouldShowApplyButton: true,
    addNewItemButtonLabel: section ? (ADD_LABELS[section.type] ?? "") : "",
  };
}
