import { SectionType } from "@custom-types/vault-types";

/** Section types the user can add, with the name shown in the UI */
export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  publications: "Publications",
  volunteering: "Volunteering",
  custom: "Custom",
  unsorted: "Unsorted",
};

/** Types the user can pick when adding a section (Unsorted is built in) */
export const SECTION_TYPES = (
  Object.keys(SECTION_TYPE_LABELS) as SectionType[]
).filter((type) => type !== "unsorted");

/** Types that have their own editor and preview; all others use the generic item layout */
export const SPECIAL_SECTION_TYPES: SectionType[] = [
  "summary",
  "experience",
  "education",
  "skills",
];

/** What the title of a new section is, unless the user types one */
export function getDefaultSectionTitle(type: SectionType): string {
  return SECTION_TYPE_LABELS[type];
}
