import { Vault } from "@custom-types/vault-types";
import { getItemLabel } from "@shared/variant/item-label";

/**
 * Short names the model uses instead of the CV's real ids: items are "i1", "i2", ..., bullets
 * "i1.b1", "i1.b2", ... Long random ids confuse small models (they swap item and bullet ids,
 * or copy the bullet text instead). `refs` maps a name back to the real thing.
 */
export interface CvRefs {
  /** "s1", "s2", ... -> section id */
  sections: Map<string, string>;
  items: Map<string, string>;
  bullets: Map<string, { itemId: string; bulletId: string; text: string }>;
}

export function buildRefs(vault: Vault): CvRefs {
  const refs: CvRefs = {
    sections: new Map(),
    items: new Map(),
    bullets: new Map(),
  };
  let itemNumber = 0;
  vault.sections.forEach((section, index) =>
    refs.sections.set(`s${index + 1}`, section.id)
  );
  for (const section of vault.sections) {
    for (const item of section.items) {
      itemNumber += 1;
      refs.items.set(`i${itemNumber}`, item.id);
      item.bullets.forEach((bullet, index) => {
        refs.bullets.set(`i${itemNumber}.b${index + 1}`, {
          itemId: item.id,
          bulletId: bullet.id,
          text: bullet.text,
        });
      });
    }
  }
  return refs;
}

/**
 * What the model is told about the CV: short names and text. Nothing it does not need. The
 * References section is left out whole: the people in it (names, emails, phone numbers) are
 * other people's personal data, and no AI action needs them.
 */
export function describeCv(
  vault: Vault,
  refs: CvRefs = buildRefs(vault)
): unknown {
  const sectionRef = new Map([...refs.sections].map(([ref, id]) => [id, ref]));
  const itemRef = new Map([...refs.items].map(([ref, id]) => [id, ref]));
  const bulletRef = new Map(
    [...refs.bullets].map(([ref, value]) => [value.bulletId, ref])
  );
  return {
    sections: vault.sections
      .filter((section) => section.type !== "references")
      .map((section) => ({
        id: sectionRef.get(section.id),
        title: section.title,
        type: section.type,
        items: section.items.map((item) => ({
          id: itemRef.get(item.id),
          label: getItemLabel(item),
          fields: item.fields,
          bullets: item.bullets.map((bullet) => ({
            id: bulletRef.get(bullet.id),
            text: bullet.text,
            ...(bullet.rating === undefined ? {} : { rating: bullet.rating }),
          })),
        })),
      })),
  };
}

/** One-word advert headings that small models copy into the requirement lists */
const HEADING_WORDS = new Set([
  "essential",
  "desirable",
  "required",
  "requirements",
  "preferred",
  "optional",
  "mandatory",
  "skills",
  "experience",
  "qualifications",
  "bonus",
  "must",
  "have",
]);

function normaliseTerm(text: string): string {
  return text
    .trim()
    .replace(/[:\-–—]+$/, "")
    .trim();
}

/** Removes heading-like entries ("Essential", "Desirable:") from a requirement list */
export function cleanRequirementList(list: string[]): string[] {
  return list
    .map(normaliseTerm)
    .filter(
      (entry) =>
        entry !== "" &&
        !(!/\s/.test(entry) && HEADING_WORDS.has(entry.toLowerCase()))
    );
}
