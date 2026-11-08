import { Array, Number, Object, Record, Static, String } from "runtypes";
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

  company: String.optional(),

  role: String.optional(),

  /** Day it was made, "YYYY-MM-DD" */
  createdAt: String,

  tone: ToneSchema,

  /** Choices by item id. An item without an entry is shown. */
  selection: Record(String, ItemSelectionSchema),

  /** Ids of vault sections this job leaves out of the CV. Missing = every section is shown. */
  hiddenSections: Array(String).optional(),

  /** The job title this job shows (one of the vault's Job Title and options). Missing = the vault's Job Title. */
  headline: String.optional(),

  /** Link ids in the order this job shows them; links not listed come last. Missing = vault order. */
  linkOrder: Array(String).optional(),

  /** The result of the last auto-fit, so printing gives the same page */
  tuning: FitTuningSchema.optional(),

  /** Set when the job was made from a tailoring proposal */
  tailor: TailorRecordSchema.optional(),

  /** The advert last used for "Score items", so it need not be pasted again */
  jobAd: String.optional(),
});

export type Job = Static<typeof JobSchema>;
