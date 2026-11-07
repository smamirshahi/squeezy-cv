import { Section, Vault } from "@custom-types/vault-types";

/** Id of the built-in Unsorted section (created on demand, never deleted) */
export const UNSORTED_SECTION_ID = "unsorted";

function isUnsorted(section: Pick<Section, "type">): boolean {
  return section.type === "unsorted";
}

/** Sections an item can be moved to: every one except the one it is in, Unsorted and the summary */
export function moveTargets(
  vault: Pick<Vault, "sections">,
  fromSectionId: string
): Section[] {
  return vault.sections.filter(
    (section) =>
      section.id !== fromSectionId &&
      !isUnsorted(section) &&
      section.type !== "summary"
  );
}
