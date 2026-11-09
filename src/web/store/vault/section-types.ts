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

/** Types a section can have (Unsorted is built in) */
export const SECTION_TYPES = (
  Object.keys(SECTION_TYPE_LABELS) as SectionType[]
).filter((type) => type !== "unsorted");

/** What the "Add a section" type list offers: a name and a one-line explanation per type */
export const ADD_SECTION_OPTIONS: {
  type: SectionType;
  label: string;
  description: string;
}[] = [
  {
    type: "summary",
    label: "Summary",
    description: "One short paragraph about you",
  },
  {
    type: "experience",
    label: "Experience",
    description: "Jobs: company, role, dates, description",
  },
  {
    type: "education",
    label: "Education",
    description: "Schools: institute, degree, dates",
  },
  {
    type: "skills",
    label: "Skills",
    description: "Groups of skills with an optional level",
  },
  {
    type: "custom",
    label: "Other section",
    description:
      "Any list of entries, e.g. Certifications, Awards, Projects, Publications, Volunteering",
  },
];

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
