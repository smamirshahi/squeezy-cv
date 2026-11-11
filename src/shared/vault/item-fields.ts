import { SKILL_CATEGORIES } from "@shared/vault/skill-suggestions";
import { SectionType } from "@custom-types/vault-types";

export interface FieldSpec {
  key: string;
  label: string;

  /**
   * "month" is a date stored as ISO "YYYY-MM-DD" (the day is always 01 when typed); "chips" is a
   * list typed as separate entries (chips) and stored as one comma separated text
   */
  kind: "text" | "month" | "multiline" | "chips";

  /** Columns it spans in a three-column grid */
  span: 1 | 2 | 3;

  /** Suggestions offered while typing (any other text is still allowed) */
  suggestions?: string[];

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

/** Kinds of project offered while typing; any other text is still allowed */
const PROJECT_TYPES = [
  "Personal",
  "Professional",
  "Academic",
  "Open source",
  "Freelance",
  "Volunteer",
];

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
    case "awards":
      return [
        {
          key: "title",
          label: "Title",
          kind: "text",
          span: 3,
          hint: 'e.g. "Best Innovation Award"',
        },
        {
          key: "issuer",
          label: "Issuer",
          kind: "text",
          span: 2,
          hint: "Organisation, company or competition",
        },
        {
          key: "date",
          label: "Date",
          kind: "text",
          span: 1,
          hint: 'Month and year, or just the year, e.g. "Mar 2024" or "2024"',
        },
        {
          key: "description",
          label: "Short description (optional)",
          kind: "text",
          span: 3,
          hint: "One line on why you won or what it recognised",
        },
        {
          key: "link",
          label: "Link (optional)",
          kind: "text",
          span: 3,
          hint: "A certificate, announcement or results page",
        },
      ];
    case "interests":
      return [
        {
          key: "title",
          label: "Interests",
          kind: "text",
          span: 3,
          hint: 'A short list or one line, e.g. "Cycling, puzzle design, LEGO Technic"',
        },
        {
          key: "detail",
          label: "Detail (optional)",
          kind: "multiline",
          span: 3,
          hint: 'One phrase, e.g. "Club cyclist, rides 100 km on weekends"',
        },
      ];
    case "projects":
      return [
        { key: "title", label: "Title", kind: "text", span: 2 },
        {
          key: "subtitle",
          label: "Role",
          kind: "text",
          span: 1,
          hint: 'e.g. "Sole developer", "Lead" or "Principal investigator"',
        },
        {
          key: "projectType",
          label: "Type",
          kind: "text",
          span: 1,
          suggestions: PROJECT_TYPES,
        },
        {
          key: "technologies",
          label: "Technologies",
          kind: "chips",
          span: 2,
          hint: "Type one and press Enter (or comma). Useful for matching job adverts.",
        },
        START,
        { ...END, hint: "Leave empty for a project that is still going." },
        {
          key: "link",
          label: "Link (optional)",
          kind: "text",
          span: 3,
          hint: "GitHub repository, live demo, store page or package page. A working demo is stronger than a repository alone.",
        },
        {
          key: "description",
          label: "Description",
          kind: "multiline",
          span: 3,
          hint: DESCRIPTION_HINT,
        },
      ];
    case "skills":
      return [
        {
          key: "category",
          label: "Category",
          kind: "text",
          span: 3,
          suggestions: SKILL_CATEGORIES,
        },
      ];
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

/** Work mode choices of an experience or education item (optional; stored as the value) */
export const WORK_MODES = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
] as const;

/** The item's work mode value; an older item with `remote: "true"` counts as remote, else "" */
export function workModeOf(fields: Record<string, string | undefined>): string {
  const mode = fields.workMode ?? "";
  if (WORK_MODES.some((choice) => choice.value === mode)) {
    return mode;
  }
  return fields.remote === "true" ? "remote" : "";
}

/** "London, UK · Hybrid" (either part may be missing) */
export function locationLabel(
  location: string | undefined,
  workMode: string | undefined
): string {
  const label = WORK_MODES.find((choice) => choice.value === workMode)?.label;
  return [location?.trim(), label].filter(Boolean).join(" · ");
}
