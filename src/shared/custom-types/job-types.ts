import { Number, Object, Record, Static, String } from "runtypes";
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

  /** The result of the last auto-fit, so printing gives the same page */
  tuning: FitTuningSchema.optional(),

  /** Set when the job was made from a tailoring proposal */
  tailor: TailorRecordSchema.optional(),
});

export type Job = Static<typeof JobSchema>;
