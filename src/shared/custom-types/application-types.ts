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
import { StyleSchema } from "@custom-types/styles-types";
import {
  FitTuningSchema,
  ToneSchema,
  VariantSchema,
} from "@custom-types/variant-types";
import {
  LinkItemSchema,
  ProfileSchema,
  SectionTypeSchema,
} from "@custom-types/vault-types";

/** The current version of the application format. Bump it together with a migration. */
export const CURRENT_APPLICATION_VERSION = 1;

/** Application ids become folder names, so only these characters are allowed */
export const APPLICATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** "YYYY-MM-DD" */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const APPLICATION_STATUSES = [
  "applied",
  "interview",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

const ApplicationStatusSchema = Union(
  Literal("applied"),
  Literal("interview"),
  Literal("offer"),
  Literal("accepted"),
  Literal("rejected"),
  Literal("withdrawn")
);

const StatusChangeSchema = Object({
  status: ApplicationStatusSchema,

  /** Day of the change, "YYYY-MM-DD" */
  at: String,

  note: String.optional(),
});

const RenderedBulletSchema = Object({
  id: String,
  text: String,
  rating: Number.optional(),
});

const RenderedItemSchema = Object({
  id: String,
  fields: Record(String, String),
  bullets: Array(RenderedBulletSchema),
  emphasis: Union(Literal("normal"), Literal("high")),
});

const RenderedPartSchema = Union(
  Object({
    kind: Literal("personalInfo"),
    id: String,
    profile: ProfileSchema,
  }),
  Object({
    kind: Literal("contactInfo"),
    id: String,
    profile: ProfileSchema,
    links: Array(LinkItemSchema),
  }),
  Object({
    kind: Literal("section"),
    id: String,
    type: SectionTypeSchema,
    title: String,
    items: Array(RenderedItemSchema),
  })
);

/** What `render(vault, variant)` produced: the CV as it was drawn */
const RenderedDocumentSchema = Object({
  tone: ToneSchema,
  pageLimit: Number,
  style: StyleSchema,
  columns: Object({
    fullWidth: Array(RenderedPartSchema),
    left: Array(RenderedPartSchema),
    right: Array(RenderedPartSchema),
  }),
});

/** The CV exactly as it was when submitted. Never changes afterwards. */
const SubmittedCvSchema = Object({
  document: RenderedDocumentSchema,

  /** The variant at that moment, so a copy can be made later */
  variant: VariantSchema,

  tuning: FitTuningSchema.optional(),
});

export const ApplicationSchema = Object({
  /** Stable id, also the folder name */
  id: String,

  /** Format version of the application */
  version: Number,

  company: String,
  role: String,
  jobUrl: String.optional(),

  /**
   * The job and template it was sent from, and their names at that time. Only references and
   * labels: the CV itself is `submitted`. Missing in files made before jobs existed (then the
   * job id is `submitted.variant.id`, see `summariseApplication`).
   */
  jobId: String.optional(),
  templateId: String.optional(),
  jobName: String.optional(),
  templateName: String.optional(),

  /** Day applied, "YYYY-MM-DD" */
  appliedAt: String,

  status: ApplicationStatusSchema,

  /** Starts with "applied" on `appliedAt`; one entry per change */
  history: Array(StatusChangeSchema),

  jobDescription: String.optional(),
  notes: String.optional(),

  /** How it was sent ("LinkedIn", "Company website", ...); only when recorded as applied elsewhere */
  appliedVia: String.optional(),

  /** The CV as sent. Missing when no CV was attached (applied elsewhere, without a CV). */
  submitted: SubmittedCvSchema.optional(),
});

export type ApplicationStatus = Static<typeof ApplicationStatusSchema>;
export type Application = Static<typeof ApplicationSchema>;

/** The fields of an application that the user types in. Everything else is derived. */
export const NewApplicationSchema = Object({
  /** The saved job to freeze and send (an older variant id also works); optional without a CV */
  jobId: String.optional(),

  /** Applied elsewhere without a CV: nothing is frozen and no PDF is made */
  withoutCv: Boolean.optional(),

  /** How it was sent, when applied elsewhere */
  via: String.optional(),
  company: String,
  role: String,
  jobUrl: String.optional(),
  appliedAt: String.optional(),
  jobDescription: String.optional(),
  notes: String.optional(),
});

export const ApplicationPatchSchema = Object({
  company: String.optional(),
  role: String.optional(),
  jobUrl: String.optional(),
  appliedAt: String.optional(),
  jobDescription: String.optional(),
  notes: String.optional(),
  status: ApplicationStatusSchema.optional(),

  /** Day of the status change. Defaults to today. */
  statusAt: String.optional(),
  statusNote: String.optional(),
});

export type NewApplication = Static<typeof NewApplicationSchema>;
export type ApplicationPatch = Static<typeof ApplicationPatchSchema>;

/** What the list shows for each application */
export interface ApplicationSummary {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedAt: string;

  /** The job that was sent ("" for a damaged application, whose job is unknown) */
  jobId: string;

  /** The template of that job when it was sent ("" when unknown, e.g. older applications) */
  templateId: string;

  /** Names of the job and template when it was sent ("" when unknown) */
  jobName: string;
  templateName: string;

  /** Day of the latest status change */
  updatedAt: string;
  isCorrupt: boolean;
}
