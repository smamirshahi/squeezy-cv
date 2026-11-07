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
export const CURRENT_VAULT_VERSION = 1;

export const LinkItemSchema = Object({
  /** Stable id */
  id: String,

  /** What the link is, e.g. "LinkedIn" */
  label: String,

  /** Full URL */
  url: String,

  /** Free tags, used later for tailoring */
  tags: Array(String),
});

export const BulletSchema = Object({
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

  /** Free tags, used later for tailoring */
  tags: Array(String),

  /** 0 to 5 in steps of 0.5. Only used by skill entries, where `text` is the skill name. */
  rating: Number.optional(),

  /** Whole years of experience with the skill. Only used by skill entries. */
  years: Number.optional(),
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
  Literal("custom")
);

export const ITEM_OPINIONS = ["love", "like", "neutral", "dislike"] as const;

export const ItemOpinionSchema = Union(
  Literal("love"),
  Literal("like"),
  Literal("neutral"),
  Literal("dislike")
);

export const ItemSchema = Object({
  /** Stable id */
  id: String,

  /**
   * Type-specific values, e.g. jobTitle, company, location, startDate, endDate for an
   * experience; category for a skills group; text for the summary. Dates are ISO (YYYY-MM-DD).
   */
  fields: Record(String, String),

  /** Bullet points (for skills groups: the individual skills) */
  bullets: Array(BulletSchema),

  /** Free tags, used later for tailoring */
  tags: Array(String),

  /** Private notes of the user. Never drawn on the CV and never sent to an AI. */
  notes: String.optional(),

  /** How the user feels about this item. Private, like `notes`. */
  opinion: ItemOpinionSchema.optional(),

  /**
   * Whether the item is shown. Transitional: moves into the variant selection
   * when variants exist.
   */
  shouldShow: Boolean,
});

export const SectionSchema = Object({
  /** Stable id */
  id: String,

  type: SectionTypeSchema,

  /** The heading shown on the CV */
  title: String,

  /**
   * Skills sections only: whether levels are used. Missing means "yes if any skill has one"
   * (see `tracksLevels`). Turning it off keeps the stored levels.
   */
  tracksLevel: Boolean.optional(),

  items: Array(ItemSchema),
});

export const ProfileSchema = Object({
  fullName: String,
  headline: String.optional(),
  email: String.optional(),
  phone: String.optional(),
  location: String.optional(),

  /** e.g. "Eligible to work in the UK". Shown under the name when the style asks for it. */
  rightToWork: String.optional(),
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
export type ItemOpinion = Static<typeof ItemOpinionSchema>;
export type Section = Static<typeof SectionSchema>;
export type Profile = Static<typeof ProfileSchema>;
export type Vault = Static<typeof VaultSchema>;
export type CvFile = Static<typeof CvFileSchema>;
