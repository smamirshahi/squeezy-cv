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

export const EmphasisSchema = Union(Literal("normal"), Literal("high"));

export const BulletSelectionSchema = Object({
  /** Hiding a bullet in a variant never removes it from the vault */
  isVisible: Boolean,

  wording: WordingSchema.optional(),
});

export const ItemSelectionSchema = Object({
  /** Hiding an item in a variant never removes it from the vault */
  isVisible: Boolean,

  emphasis: EmphasisSchema.optional(),

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
});

export type Tone = Static<typeof ToneSchema>;
export type Wording = Static<typeof WordingSchema>;
export type Emphasis = Static<typeof EmphasisSchema>;
export type BulletSelection = Static<typeof BulletSelectionSchema>;
export type ItemSelection = Static<typeof ItemSelectionSchema>;
export type VariantLayout = Static<typeof VariantLayoutSchema>;
export type Variant = Static<typeof VariantSchema>;
