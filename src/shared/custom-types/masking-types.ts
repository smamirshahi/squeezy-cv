import {
  Array,
  Boolean,
  Literal,
  Number,
  Object,
  Static,
  String,
  Union,
} from "runtypes";

/** What a piece of text the user masked by hand is: decides its placeholder (`[Company 3]`, `[Location 1]`) */
export const MASK_KINDS = [
  "company",
  "school",
  "person",
  "location",
  "date",
  "other",
] as const;
export type MaskKind = (typeof MASK_KINDS)[number];

const MaskKindSchema = Union(
  Literal("company"),
  Literal("school"),
  Literal("person"),
  Literal("location"),
  Literal("date"),
  Literal("other")
);

/** The user's own choices of what to hide from the AI, on top of the automatic masking */
export const MaskingSchema = Object({
  /** Text the user selected to mask (every place it appears, ignoring case) */
  custom: Array(Object({ text: String, kind: MaskKindSchema })),

  /** Automatically found values (name, employer, ...) the user chose NOT to mask, lower case */
  skip: Array(String),
});
export type Masking = Static<typeof MaskingSchema>;

/** One thing the dialog lists: what it is replaced with, what it is, how often it appears */
const MaskTermSchema = Object({
  placeholder: String,
  value: String,
  count: Number,
  isMasked: Boolean,
  isCustom: Boolean,
});
export type MaskTerm = Static<typeof MaskTermSchema>;
