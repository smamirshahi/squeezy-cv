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
}

export const PREMADE_TEMPLATES: PremadeTemplate[] = [
  {
    key: "developer",
    name: "Developer",
    description:
      "One column for 1-2 pages: header, summary, grouped skills, experience, projects or open source, then education and certifications.",
    buildLayout: developerLayout,
  },
];
