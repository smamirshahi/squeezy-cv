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
import { StyleSchema } from "@custom-types/styles-types";

/** The current version of the variant format. Bump it together with a migration. */
export const CURRENT_VARIANT_VERSION = 1;

/** Variant ids become file names, so only these characters are allowed */
export const VARIANT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const ToneSchema = Union(
  Literal("neutral"),
  Literal("formal"),
  Literal("conversational")
);

/** Which wording of a bullet to show. Falls back to the canonical `text` if missing. */
export const WordingSchema = Union(
  Literal("text"),
  Literal("short"),
  Literal("long"),
  Literal("formal")
);

/** How a skill's level is drawn. Missing = the earlier look (stars from the style's rating icon). */
export const SkillDisplaySchema = Union(
  Literal("none"),
  Literal("dots"),
  Literal("bars"),
  Literal("stars")
);

export const EmphasisSchema = Union(Literal("normal"), Literal("high"));

export const BulletSelectionSchema = Object({
  /** Hiding a bullet in a variant never removes it from the vault */
  isVisible: Boolean,

  wording: WordingSchema.optional(),

  /** Position within its item. Bullets without one keep their vault position after those with one. */
  order: Number.optional(),
});

export const ItemSelectionSchema = Object({
  /** Hiding an item in a variant never removes it from the vault */
  isVisible: Boolean,

  emphasis: EmphasisSchema.optional(),

  /** How relevant the item is to this variant's target (0-100), set by tailoring. Used to pick what to hide first when it does not fit. */
  relevance: Number.optional(),

  /** Position within its section. Items without one keep their vault position after those with one. */
  order: Number.optional(),

  /** Per-bullet choices by bullet id. A bullet without an entry is shown with its `text`. */
  bullets: Record(String, BulletSelectionSchema).optional(),
});

/** Which parts sit in which column. Header parts and section ids, like the app's page structure. */
export const VariantLayoutSchema = Object({
  fullWidth: Array(String),
  left: Array(String),
  right: Array(String),
});

/** What auto-fit changed to make the CV fit. 1 means "as the style says". */
export const FitTuningSchema = Object({
  spacing: Number,
  marginMm: Number,
  fontScale: Number,
});

/** How far auto-fit may go; missing values use the defaults */
export const FitLimitsSchema = Object({
  minSpacing: Number.optional(),
  minMarginMm: Number.optional(),
  minBodyPt: Number.optional(),
});

export const FitModeSchema = Union(Literal("fit"), Literal("fill"));

/**
 * What the AI tailoring said when this variant was made from a job advert. Kept so the export
 * can still check the CV against the job. Never used to change the variant.
 */
export const TailorRecordSchema = Object({
  /** Day it was made, "YYYY-MM-DD" */
  at: String,

  jobTitle: String,
  requirements: RequirementsSchema,

  /** What the job asks for that the CV did not show (after the checks) */
  gaps: Array(String),

  /** Rewordings the checker flagged and the user accepted by hand: they must be true */
  acceptedFlagged: Array(
    Object({
      bulletId: String,
      wording: String,
      text: String,
      flags: Array(String),
    })
  ),
});

export const VariantSchema = Object({
  /** Stable id, also the file name */
  id: String,

  /** Format version of the variant */
  version: Number,

  /** Name shown in lists, e.g. "Acme - Senior React Dev" */
  name: String,

  tone: ToneSchema,

  /** The number of pages the CV should fit on */
  pageLimit: Number,

  layout: VariantLayoutSchema,

  /** Choices by item id. An item without an entry is shown. */
  selection: Record(String, ItemSelectionSchema),

  style: StyleSchema,

  /** Whether the preview shrinks (or fills) the CV to the page limit */
  isAutoFit: Boolean.optional(),

  fitMode: FitModeSchema.optional(),

  /** User limits for auto-fit (spacing, margin and body text floors) */
  fitLimits: FitLimitsSchema.optional(),

  /** The result of the last auto-fit, so printing gives the same page */
  tuning: FitTuningSchema.optional(),

  /** How skill levels are shown on the page (the levels themselves live in the vault) */
  skillDisplay: SkillDisplaySchema.optional(),

  /** Columns of the skill lists, 1 or 2 (default 1) */
  skillColumns: Union(Literal(1), Literal(2)).optional(),

  /** Skills with a level below this (1-5) are not shown in this variant. Unrated skills count as 0. */
  skillMinLevel: Number.optional(),

  /** Set when the variant was made from a tailoring proposal */
  tailor: TailorRecordSchema.optional(),
});

export type TailorRecord = Static<typeof TailorRecordSchema>;
export type FitTuning = Static<typeof FitTuningSchema>;
export type FitLimitsValue = Static<typeof FitLimitsSchema>;
export type FitMode = Static<typeof FitModeSchema>;
export type SkillDisplay = Static<typeof SkillDisplaySchema>;
export type Tone = Static<typeof ToneSchema>;
export type Wording = Static<typeof WordingSchema>;
export type Emphasis = Static<typeof EmphasisSchema>;
export type BulletSelection = Static<typeof BulletSelectionSchema>;
export type ItemSelection = Static<typeof ItemSelectionSchema>;
export type VariantLayout = Static<typeof VariantLayoutSchema>;
export type Variant = Static<typeof VariantSchema>;
