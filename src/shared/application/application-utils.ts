import {
  Application,
  ApplicationPatch,
  ApplicationStatus,
  ApplicationSummary,
  CURRENT_APPLICATION_VERSION,
  DATE_PATTERN,
  NewApplication,
} from "@custom-types/application-types";
import { Variant } from "@custom-types/variant-types";
import { Vault } from "@custom-types/vault-types";
import { render } from "@shared/variant/render";

/** An Applied application with no news for this many days is shown as "No reply" */
export const NO_REPLY_DAYS = 30;

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const MS_PER_DAY =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
const MAX_ID_LENGTH = 64;
const MAX_SLUG_LENGTH = 20;
const MAX_TEXT_LENGTH = 200;
const MAX_LONG_TEXT_LENGTH = 100_000;
const DATE_LENGTH = 10;
const ID_SUFFIX_LENGTH = 4;

/** The user typed something that cannot be saved. The message says what to fix. */
export class ApplicationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationInputError";
  }
}

/** Today as "YYYY-MM-DD" (in the machine's time zone) */
export function toIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isIsoDay(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, DATE_LENGTH) === value
  );
}

function requireDay(value: string, label: string): string {
  if (!isIsoDay(value)) {
    throw new ApplicationInputError(
      `${label} must be a real date like 2026-11-06.`
    );
  }
  return value;
}

function requireText(
  value: string,
  label: string,
  maxLength = MAX_TEXT_LENGTH
): string {
  const text = value.trim();
  if (text === "") {
    throw new ApplicationInputError(`${label} is required.`);
  }
  if (text.length > maxLength) {
    throw new ApplicationInputError(
      `${label} must be at most ${maxLength} characters.`
    );
  }
  return text;
}

/** Empty text means "nothing": stored as absent */
function optionalText(
  value: string | undefined,
  label: string,
  maxLength: number
): string | undefined {
  const text = value?.trim();
  if (!text) {
    return undefined;
  }
  if (text.length > maxLength) {
    throw new ApplicationInputError(
      `${label} must be at most ${maxLength} characters.`
    );
  }
  return text;
}

function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

/** e.g. "2026-11-06-acme-senior-react-dev-x7k2": readable in the folder list, always valid */
export function createApplicationId(
  company: string,
  role: string,
  appliedAt: string,
  suffix: string
): string {
  const parts = [
    appliedAt,
    slugify(company),
    slugify(role),
    suffix.slice(0, ID_SUFFIX_LENGTH),
  ].filter((part) => part !== "");
  return parts.join("-").slice(0, MAX_ID_LENGTH);
}

/**
 * Freezes the saved CV into an application: the rendered document plus the variant as it is
 * now. Nothing here points back at the vault, so later edits cannot change it.
 */
export function createApplication(
  input: NewApplication,
  vault: Vault,
  variant: Variant,
  today: string,
  idSuffix: string
): Application {
  const company = requireText(input.company, "Company");
  const role = requireText(input.role, "Role");
  const appliedAt = requireDay(input.appliedAt ?? today, "Date applied");
  const frozenVariant: Variant = structuredClone(variant);
  // render() shares objects with the vault (e.g. the profile), so copy them too
  const document = structuredClone(render(vault, frozenVariant));
  const jobUrl = optionalText(input.jobUrl, "Job link", MAX_TEXT_LENGTH);
  const jobDescription = optionalText(
    input.jobDescription,
    "Job description",
    MAX_LONG_TEXT_LENGTH
  );
  const notes = optionalText(input.notes, "Notes", MAX_LONG_TEXT_LENGTH);
  return {
    id: createApplicationId(company, role, appliedAt, idSuffix),
    version: CURRENT_APPLICATION_VERSION,
    company,
    role,
    ...(jobUrl ? { jobUrl } : {}),
    appliedAt,
    status: "applied",
    history: [{ status: "applied", at: appliedAt }],
    ...(jobDescription ? { jobDescription } : {}),
    ...(notes ? { notes } : {}),
    submitted: {
      document,
      variant: frozenVariant,
      ...(frozenVariant.tuning ? { tuning: frozenVariant.tuning } : {}),
    },
  };
}

/**
 * Applies edits. A different status adds a line to the timeline (dated `statusAt`, default
 * today). The submitted CV is never touched.
 */
export function updateApplication(
  application: Application,
  patch: ApplicationPatch,
  today: string
): Application {
  const next: Application = { ...application };
  if (patch.company !== undefined) {
    next.company = requireText(patch.company, "Company");
  }
  if (patch.role !== undefined) {
    next.role = requireText(patch.role, "Role");
  }
  if (patch.appliedAt !== undefined) {
    next.appliedAt = requireDay(patch.appliedAt, "Date applied");
    // The first timeline entry is the application itself
    next.history = application.history.map((change, index) =>
      index === 0 ? { ...change, at: next.appliedAt } : change
    );
  }
  const textPatches: [keyof ApplicationPatch, string, number][] = [
    ["jobUrl", "Job link", MAX_TEXT_LENGTH],
    ["jobDescription", "Job description", MAX_LONG_TEXT_LENGTH],
    ["notes", "Notes", MAX_LONG_TEXT_LENGTH],
  ];
  for (const [key, label, maxLength] of textPatches) {
    if (key in patch) {
      const text = optionalText(patch[key], label, maxLength);
      const target = next as unknown as Record<string, unknown>;
      if (text) {
        target[key] = text;
      } else {
        delete target[key];
      }
    }
  }
  if (patch.status !== undefined && patch.status !== application.status) {
    const at = requireDay(patch.statusAt ?? today, "Date of the change");
    const note = optionalText(patch.statusNote, "Note", MAX_TEXT_LENGTH);
    next.status = patch.status;
    next.history = [
      ...next.history,
      { status: patch.status, at, ...(note ? { note } : {}) },
    ];
  }
  return next;
}

/** The day of the latest timeline entry */
export function lastUpdateDay(application: Application): string {
  return application.history.reduce(
    (latest, change) => (change.at > latest ? change.at : latest),
    application.appliedAt
  );
}

/** Whole days from `from` to `to` (both "YYYY-MM-DD") */
export function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

/** Derived, never stored: still "applied" and nothing has happened for 30 days */
export function isNoReply(
  application: Pick<ApplicationSummary, "status" | "updatedAt">,
  today: string
): boolean {
  return (
    application.status === "applied" &&
    daysBetween(application.updatedAt, today) >= NO_REPLY_DAYS
  );
}

export function summariseApplication(
  application: Application
): ApplicationSummary {
  return {
    id: application.id,
    company: application.company,
    role: application.role,
    status: application.status,
    appliedAt: application.appliedAt,
    updatedAt: lastUpdateDay(application),
    isCorrupt: false,
  };
}

/** What the page calls each status */
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-11-06" -> "6 Nov 2026" (fixed English, independent of the machine's language) */
export function formatDay(day: string): string {
  if (!isIsoDay(day)) {
    return day;
  }
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTHS[month - 1]} ${year}`;
}
