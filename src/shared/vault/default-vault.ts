import { CURRENT_VAULT_VERSION, Vault } from "@custom-types/vault-types";

/** Ids of the four sections every new CV starts with. Imported CVs keep their own ids. */
const DEFAULT_SECTION_IDS = {
  summary: "summary",
  experience: "experience",
  education: "education",
  skills: "skills",
} as const;

/** Ids of the two parts of the CV header. They come from the profile and links, not from sections. */
export const HEADER_IDS = ["personalInfo", "contactInfo"] as const;

/** A new, empty vault with the usual sections, so there is something to edit */
export function createDefaultVault(): Vault {
  return {
    version: CURRENT_VAULT_VERSION,
    profile: { fullName: "" },
    links: [],
    sections: [
      {
        id: DEFAULT_SECTION_IDS.summary,
        type: "summary",
        title: "Professional Summary",
        items: [],
      },
      {
        id: DEFAULT_SECTION_IDS.experience,
        type: "experience",
        title: "Work Experience",
        items: [],
      },
      {
        id: DEFAULT_SECTION_IDS.education,
        type: "education",
        title: "Education",
        items: [],
      },
      {
        id: DEFAULT_SECTION_IDS.skills,
        type: "skills",
        title: "Skills",
        items: [],
      },
    ],
  };
}
