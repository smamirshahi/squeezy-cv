import { SectionType } from "@custom-types/vault-types";

export interface FieldSpec {
  key: string;
  label: string;

  /** "month" is a date stored as ISO "YYYY-MM-DD" (the day is always 01 when typed) */
  kind: "text" | "month" | "multiline";

  /** Columns it spans in a three-column grid */
  span: 1 | 2 | 3;

  /** An end date: empty means "Present" */
  isEnd?: boolean;

  /** Help shown in an (i) tooltip beside the field */
  hint?: string;
}

/** What the (i) beside every Description field says */
export const DESCRIPTION_HINT =
  "Write freely whatever comes to your mind about this. Later, AI can generate bullet points from it or reword it for a specific job.";

const START: FieldSpec = {
  key: "startDate",
  label: "Start",
  kind: "month",
  span: 1,
};
const END: FieldSpec = {
  key: "endDate",
  label: "End",
  kind: "month",
  span: 1,
  isEnd: true,
};

/**
 * The fields of an item in the vault editor, by section type. The keys are the ones the page
 * draws (do not rename them). Types the editor has no special form for use the generic one.
 */
export function fieldSpecsFor(type: SectionType): FieldSpec[] {
  switch (type) {
    case "experience":
      return [
        { key: "jobTitle", label: "Job title", kind: "text", span: 2 },
        { key: "company", label: "Organisation", kind: "text", span: 1 },
        { key: "location", label: "Location", kind: "text", span: 1 },
        START,
        END,
        { key: "link", label: "Link (optional)", kind: "text", span: 3 },
        {
          key: "description",
          label: "Description",
          kind: "multiline",
          span: 3,
          hint: DESCRIPTION_HINT,
        },
      ];
    case "education":
      return [
        { key: "degree", label: "Degree", kind: "text", span: 2 },
        { key: "institute", label: "Institute", kind: "text", span: 1 },
        {
          key: "fieldOfStudy",
          label: "Field of study",
          kind: "text",
          span: 3,
        },
        { key: "location", label: "Location", kind: "text", span: 1 },
        START,
        END,
        { key: "link", label: "Link (optional)", kind: "text", span: 3 },
        {
          key: "dissertationTitle",
          label: "Dissertation title (optional)",
          kind: "text",
          span: 3,
        },
        {
          key: "description",
          label: "Description",
          kind: "multiline",
          span: 3,
          hint: DESCRIPTION_HINT,
        },
      ];
    case "publications":
      return [
        { key: "title", label: "Title", kind: "text", span: 3 },
        {
          key: "authors",
          label: "Authors",
          kind: "text",
          span: 3,
          hint: "Separate names with commas, e.g. Jane Doe, John Smith",
        },
        { key: "journal", label: "Journal / venue", kind: "text", span: 2 },
        { key: "year", label: "Year", kind: "text", span: 1 },
        { key: "link", label: "Link or DOI URL", kind: "text", span: 3 },
      ];
    case "skills":
      return [{ key: "category", label: "Category", kind: "text", span: 3 }];
    case "summary":
      return [{ key: "text", label: "Summary", kind: "multiline", span: 3 }];
    default:
      return [
        { key: "title", label: "Title", kind: "text", span: 2 },
        { key: "subtitle", label: "Subtitle", kind: "text", span: 1 },
        { key: "location", label: "Location", kind: "text", span: 1 },
        START,
        END,
        {
          key: "description",
          label: "Description",
          kind: "multiline",
          span: 3,
          hint: DESCRIPTION_HINT,
        },
      ];
  }
}

/** "2021-03-15" as the value of a month input ("2021-03"); anything else is empty */
export function toMonthValue(iso: string | undefined): string {
  const match = /^(\d{4})-(\d{2})/.exec(iso ?? "");
  return match ? `${match[1]}-${match[2]}` : "";
}

/** A month input's "2021-03" as the stored ISO day; empty stays empty */
export function fromMonthValue(month: string): string {
  return /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : "";
}

export function locationLabel(
  location: string | undefined,
  isRemote: string | undefined
): string {
  return [location?.trim(), isRemote === "true" ? "Remote" : ""]
    .filter(Boolean)
    .join(" · ");
}
