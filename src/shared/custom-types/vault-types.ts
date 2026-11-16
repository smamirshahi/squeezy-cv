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
import { MetaDataSchema } from "@custom-types/json-types";
import { StyleSchema } from "@custom-types/styles-types";

/** The current version of the vault format. Bump it together with a new migration. */
export const CURRENT_VAULT_VERSION = 3;

export const LinkItemSchema = Object({
  /** Stable id */
  id: String,

  /** What the link is, e.g. "LinkedIn" */
  label: String,

  /** Full URL */
  url: String,

  /** Free tags: no longer edited or sent to AI, kept so older files still read */
  tags: Array(String),
});

const BulletSchema = Object({
  /** Stable id */
  id: String,

  /** The canonical wording. Never overwritten by tailoring. */
  text: String,

  /** Alternative wordings the user (or later the AI) can pick per variant */
  alt: Object({
    short: String.optional(),
    long: String.optional(),
    formal: String.optional(),
  }).optional(),

  /** Free tags: no longer edited or sent to AI, kept so older files still read */
  tags: Array(String),

  /** 0 to 5 in steps of 0.5. Only used by skill entries, where `text` is the skill name. */
  rating: Number.optional(),
});

export const SectionTypeSchema = Union(
  Literal("summary"),
  Literal("experience"),
  Literal("education"),
  Literal("skills"),
  Literal("projects"),
  Literal("certifications"),
  Literal("publications"),
  Literal("volunteering"),
  Literal("awards"),
  Literal("interests"),
  Literal("references"),
  Literal("custom"),
  Literal("unsorted")
);

const ItemSchema = Object({
  /** Stable id */
  id: String,

  /**
   * Type-specific values, e.g. jobTitle, company, location, startDate, endDate for an
   * experience; category for a skills group; text for the summary. Dates are ISO (YYYY-MM-DD).
   */
  fields: Record(String, String),

  /** Bullet points (for skills groups: the individual skills) */
  bullets: Array(BulletSchema),

  /** Free tags: no longer edited or sent to AI, kept so older files still read */
  tags: Array(String),

  /**
   * Not used any more: whether an item is shown is decided per job (`Job.selection`).
   * Kept so old files still read.
   */
  shouldShow: Boolean,
});

const SectionSchema = Object({
  /** Stable id */
  id: String,

  type: SectionTypeSchema,

  /** The heading shown on the CV */
  title: String,

  /** Legacy field retained while loading old files; skill levels are always tracked. */
  tracksLevel: Boolean.optional(),

  items: Array(ItemSchema),
});

export const ProfileSchema = Object({
  fullName: String,
  headline: String.optional(),

  /** Other job titles to choose from per job (e.g. "Frontend Engineer"); the one shown is the job's choice */
  headlineOptions: Array(String).optional(),

  email: String.optional(),
  phone: String.optional(),
  location: String.optional(),

  /** e.g. "Eligible to work in the UK". Shown under the name when the style asks for it. */
  rightToWork: String.optional(),

  /** Nationalities, picked from a list (e.g. "British"). Shown under the name when the style asks for it. */
  nationalities: Array(String).optional(),

  /** Marital status, picked from a list. Shown under the name when the style asks for it. */
  maritalStatus: String.optional(),

  /** Gender, picked from a list. Shown under the name when the style asks for it. */
  gender: String.optional(),

  /**
   * How the user's name is written in publication citations, e.g. "Doe, J." (other spellings
   * separated by a semicolon). Missing = the full name. Used to bold the user among the authors.
   */
  citationName: String.optional(),

  /** A small photo as a data URL (cropped to 4:5 in the browser). Drawn in the header; never sent to AI. */
  photo: String.optional(),

  /** The picture as chosen (scaled down, not cropped), so the crop can be adjusted again later */
  photoSource: String.optional(),

  /** How `photoSource` was cropped: zoom (1 = just covers the frame) and the middle of the frame as a fraction (0-1) of the picture */
  photoCrop: Object({ zoom: Number, cx: Number, cy: Number }).optional(),
});

export const VaultSchema = Object({
  /** Format version, see CURRENT_VAULT_VERSION */
  version: Number,

  profile: ProfileSchema,

  links: Array(LinkItemSchema),

  sections: Array(SectionSchema),
});

/** What is saved to and loaded from disk. `style` moves into the variant later. */
export const CvFileSchema = Object({
  metaData: MetaDataSchema,
  vault: VaultSchema,
  style: StyleSchema,
});

export type LinkItem = Static<typeof LinkItemSchema>;
export type Bullet = Static<typeof BulletSchema>;
export type SectionType = Static<typeof SectionTypeSchema>;
export type Item = Static<typeof ItemSchema>;
export type Section = Static<typeof SectionSchema>;
export type Profile = Static<typeof ProfileSchema>;
export type Vault = Static<typeof VaultSchema>;
export type CvFile = Static<typeof CvFileSchema>;
