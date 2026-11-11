import {
  Array,
  Boolean,
  Literal,
  Number,
  Object,
  Record,
  Static,
  String,
  Union,
} from "runtypes";
import { RequirementsSchema } from "@custom-types/requirements-types";
import { JobOpinionSchema } from "@custom-types/json-types";
import {
  FitTuningSchema,
  ItemSelectionSchema,
  TailorRecordSchema,
  ToneSchema,
} from "@custom-types/variant-types";

/** Ids become file names, so only these characters (same rule as variants) */
export const JOB_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** The current version of the job format. Bump it together with a migration. */
export const CURRENT_JOB_VERSION = 1;

/** The page limit of a job that has none of its own */
export const DEFAULT_PAGE_LIMIT = 1;

/**
 * One target (a company and role): which template it uses and what it shows.
 * Hiding or reordering here never touches the vault or the template.
 */
export const JobSchema = Object({
  /** Stable id, also the file name */
  id: String,

  /** Format version of the job */
  version: Number,

  /** Name shown in lists, e.g. "Acme - Senior React Dev" */
  name: String,

  /** The template this job is drawn with */
  templateId: String,

  /**
   * How many pages this CV may use. The job decides it (it is what auto-fit and hiding aim
   * for); missing = `DEFAULT_PAGE_LIMIT`. Recruiters expect 1 page, 2 at most.
   */
  pageLimit: Number.optional(),

  company: String.optional(),

  role: String.optional(),

  /** Where the job is before it is sent: still being prepared (default) or ready to apply */
  stage: Union(Literal("draft"), Literal("ready")).optional(),

  /** Where the job is, e.g. "London" */
  location: String.optional(),

  /** Where the work is done */
  workMode: Union(
    Literal("onsite"),
    Literal("hybrid"),
    Literal("remote")
  ).optional(),

  /** Full time, part time and so on */
  employmentType: Union(
    Literal("fullTime"),
    Literal("partTime"),
    Literal("contract"),
    Literal("freelance"),
    Literal("internship")
  ).optional(),

  /** Salary range of the job, both ends as the advert states them (per year) */
  salaryMin: Number.optional(),
  salaryMax: Number.optional(),

  /** False when the advert gives one fixed number (kept in `salaryMin`); missing = a range */
  salaryIsRange: Boolean.optional(),

  /** How the user feels about the job (private) */
  feeling: JobOpinionSchema.optional(),

  /** How likely the user thinks it is to get the job (private) */
  chance: Union(
    Literal("veryLow"),
    Literal("low"),
    Literal("medium"),
    Literal("high"),
    Literal("veryHigh")
  ).optional(),

  /** The salary the user expects */
  expectedSalary: Number.optional(),

  /** Link to the advert */
  url: String.optional(),

  /** Day it was made, "YYYY-MM-DD" */
  createdAt: String,

  tone: ToneSchema,

  /** Choices by item id. An item without an entry is shown. */
  selection: Record(String, ItemSelectionSchema),

  /** Ids of vault sections this job leaves out of the CV. Missing = every section is shown. */
  hiddenSections: Array(String).optional(),

  /** The job title this job shows (one of the vault's Job Title and options). Missing = the vault's Job Title. */
  headline: String.optional(),

  /** How well each job title fits this job (0-100, from "Score job titles"), by the title's text */
  titleScores: Record(
    String,
    Object({ relevance: Number, reason: String })
  ).optional(),

  /** Link ids in the order this job shows them; links not listed come last. Missing = vault order. */
  linkOrder: Array(String).optional(),

  /** Link ids this job leaves out. Missing = every link is shown. */
  hiddenLinks: Array(String).optional(),

  /** The result of the last auto-fit, so printing gives the same page */
  tuning: FitTuningSchema.optional(),

  /** Set when the job was made from a tailoring proposal */
  tailor: TailorRecordSchema.optional(),

  /** The advert pasted for this job */
  jobAd: String.optional(),

  /** What the advert asks for (keywords, must-haves), made by "Analyse job description" and used by each section's Tailor button */
  analysis: RequirementsSchema.optional(),
});

export type Job = Static<typeof JobSchema>;
