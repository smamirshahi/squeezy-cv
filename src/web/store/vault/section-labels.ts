import { HEADER_IDS } from "@shared/vault/default-vault";
import { Section } from "@custom-types/vault-types";

const HEADER_LABELS: Record<(typeof HEADER_IDS)[number], string> = {
  personalInfo: "Personal Info",
  contactInfo: "Contact Info",
};

/**
 * The name shown for a part of the CV in the page-structure editor: the section title,
 * or a fixed name for the header parts. Falls back to the id.
 */
export function getPreviewPartLabel(id: string, sections: Section[]): string {
  if (id in HEADER_LABELS) {
    return HEADER_LABELS[id as keyof typeof HEADER_LABELS];
  }
  return sections.find((s) => s.id === id)?.title || id;
}
