import { SectionType } from "@custom-types/vault-types";
import { SectionColumns, developerLayout } from "@shared/vault/page-structure";

/**
 * A ready-made template the app ships (#488). It is not saved anywhere: "Add to my templates"
 * makes a real template from it, with the layout built from the vault's own sections.
 */
interface PremadeTemplate {
  key: string;
  /** Name of the template made from it */
  name: string;
  description: string;
  buildLayout: (
    sections: { id: string; type: SectionType }[]
  ) => SectionColumns;
  /** Colours the template starts with; missing = the colours of the template it is copied from */
  colors?: { text: string; secondary: string; accent: string };
}

export const PREMADE_TEMPLATES: PremadeTemplate[] = [
  {
    key: "developer",
    name: "Developer",
    description:
      "One column: header, summary, skills, experience, projects and education. Everything else (publications, awards, certifications, interests, unsorted) is left out.",
    buildLayout: developerLayout,
    colors: { text: "#222222", secondary: "#555555", accent: "#1f3a5f" },
  },
];
