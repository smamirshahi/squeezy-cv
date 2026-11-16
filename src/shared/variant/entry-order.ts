import { SectionType } from "@custom-types/vault-types";
import { Style } from "@custom-types/styles-types";
import { sortPublicationsNewestFirst } from "@shared/vault/citation";

interface HasFields {
  id: string;
  fields: Record<string, string | undefined>;
}

/** The end of an entry as sortable text; a missing end means "Present", the latest of all */
function endOf(fields: HasFields["fields"]): string {
  const end = (fields.endDate ?? "").trim();
  return end === "" ? "9999-99-99" : end;
}

/**
 * Entries of a work experience or education section by their dates: the end date first (an
 * entry that is still going on counts as the latest), then the start date. Entries with the same
 * dates keep their order.
 */
export function sortByDates<T extends HasFields>(
  items: T[],
  order: "newest" | "oldest"
): T[] {
  const direction = order === "newest" ? -1 : 1;
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const byEnd = endOf(a.item.fields).localeCompare(endOf(b.item.fields));
      const byStart = (a.item.fields.startDate ?? "").localeCompare(
        b.item.fields.startDate ?? ""
      );
      const result = byEnd !== 0 ? byEnd : byStart;
      return result === 0 ? a.index - b.index : result * direction;
    })
    .map(({ item }) => item);
}

/**
 * Applies the order the template chose for a section type. An order the job set by hand
 * (`hasJobOrder`) wins, so this is skipped then.
 */
export function orderForTemplate<T extends HasFields>(
  type: SectionType,
  items: T[],
  style: Pick<Style, "experienceOrder" | "educationOrder" | "publicationOrder">,
  hasJobOrder: boolean
): T[] {
  if (hasJobOrder) {
    return items;
  }
  switch (type) {
    case "experience":
      return sortByDates(items, style.experienceOrder ?? "newest");
    case "education":
      return sortByDates(items, style.educationOrder ?? "newest");
    case "publications":
      return style.publicationOrder === "manual"
        ? items
        : sortPublicationsNewestFirst(items);
    default:
      return items;
  }
}
