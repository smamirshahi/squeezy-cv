import { Literal, Number, Object, Static, String, Union } from "runtypes";

/** The current version of the candidate format. Bump it together with a migration. */
export const CURRENT_CANDIDATE_VERSION = 1;

/** Candidate ids become file names, so only these characters are allowed */
export const CANDIDATE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const CandidateStatusSchema = Union(
  Literal("open"),
  Literal("started"),
  Literal("dropped")
);

/**
 * A job found and parked to apply for later, before any CV is built for it. Continuing it
 * creates a job (status "started"); dropping it keeps the note but takes it off the to-do list.
 */
export const CandidateSchema = Object({
  /** Stable id, also the file name */
  id: String,

  /** Format version of the candidate */
  version: Number,

  company: String,
  role: String,
  jobUrl: String.optional(),

  /** The advert text, as pasted */
  jobAd: String.optional(),

  /** Private note */
  note: String.optional(),

  /** Day to apply by, "YYYY-MM-DD" */
  applyBy: String.optional(),

  status: CandidateStatusSchema,

  /** The job made by "Continue" */
  jobId: String.optional(),

  /** Day it was saved, "YYYY-MM-DD" */
  createdAt: String,
});

export type Candidate = Static<typeof CandidateSchema>;

/** What the user types when saving a candidate */
export const NewCandidateSchema = Object({
  company: String,
  role: String,
  jobUrl: String.optional(),
  jobAd: String.optional(),
  note: String.optional(),
  applyBy: String.optional(),
});

export const CandidatePatchSchema = Object({
  company: String.optional(),
  role: String.optional(),
  jobUrl: String.optional(),
  jobAd: String.optional(),
  note: String.optional(),
  /** An empty string clears the day */
  applyBy: String.optional(),
  status: CandidateStatusSchema.optional(),
  jobId: String.optional(),
});

export type NewCandidate = Static<typeof NewCandidateSchema>;
export type CandidatePatch = Static<typeof CandidatePatchSchema>;
