import { Side } from "@custom-types/styles-types";
import { SectionType } from "@custom-types/vault-types";
import { HEADER_IDS } from "@shared/vault/default-vault";

/** Which section ids sit in which column of the preview */
export type SectionColumns = Record<Side, string[]>;

const SIDES: Side[] = ["fullWidth", "left", "right"];

/**
 * Makes the page structure consistent with the sections that exist: ids that no
 * longer exist (e.g. a deleted section) and duplicates are dropped. Ids that are not
 * placed yet (e.g. a new section) are left out: a template only shows what was added to
 * it on purpose. With `shouldAddMissing` they are appended to `defaultSide` in `validIds`
 * order instead. Existing placement and order are otherwise kept. Returns a new object.
 */
export function reconcileStructure(
  structure: SectionColumns,
  validIds: string[],
  defaultSide: Side = "left",
  shouldAddMissing = false
): SectionColumns {
  const valid = new Set(validIds);
  const seen = new Set<string>();
  const result: SectionColumns = { fullWidth: [], left: [], right: [] };

  for (const side of SIDES) {
    for (const id of structure[side]) {
      if (valid.has(id) && !seen.has(id)) {
        seen.add(id);
        result[side].push(id);
      }
    }
  }

  // The header always has a place; other sections only when asked to
  const isHeader = (id: string): boolean =>
    (HEADER_IDS as readonly string[]).includes(id);
  for (const id of validIds) {
    if (!seen.has(id) && (shouldAddMissing || isHeader(id))) {
      seen.add(id);
      result[defaultSide].push(id);
    }
  }

  return result;
}

/** UK default: header, then every section below the other, full width, in the given order */
export function singleColumnLayout(sections: { id: string }[]): SectionColumns {
  return {
    fullWidth: [...HEADER_IDS, ...sections.map((s) => s.id)],
    left: [],
    right: [],
  };
}

/**
 * Section types of the developer CV in the order they are drawn: summary, grouped skills,
 * experience, projects or open source and education. Every other type
 * (publications, awards, certifications, unsorted, ...) is left out of the template.
 */
const DEVELOPER_ORDER: SectionType[] = [
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
];

/**
 * Developer CV: one column, header first, then the sections by type in the order of
 * `DEVELOPER_ORDER`; sections of any other type are left out. Sections of a
 * type listed twice keep the vault's order among themselves.
 */
export function developerLayout(
  sections: { id: string; type: SectionType }[]
): SectionColumns {
  const rank = (type: SectionType): number => DEVELOPER_ORDER.indexOf(type);
  // Array.prototype.sort is stable, so equal ranks keep the vault's order
  const ordered = sections
    .filter((s) => rank(s.type) !== -1)
    .sort((a, b) => rank(a.type) - rank(b.type));
  return {
    fullWidth: [...HEADER_IDS, ...ordered.map((s) => s.id)],
    left: [],
    right: [],
  };
}

/**
 * Two columns: header and summary across the top, experience on the left, everything
 * else on the right
 */
export function twoColumnLayout(
  sections: { id: string; type: SectionType }[]
): SectionColumns {
  return {
    fullWidth: [
      ...HEADER_IDS,
      ...sections.filter((s) => s.type === "summary").map((s) => s.id),
    ],
    left: sections.filter((s) => s.type === "experience").map((s) => s.id),
    right: sections
      .filter((s) => s.type !== "summary" && s.type !== "experience")
      .map((s) => s.id),
  };
}
