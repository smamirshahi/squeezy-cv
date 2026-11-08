import { Array, Literal, Object, Static, String, Union } from "runtypes";

/**
 * What the AI does with an item's description for a job: make bullets from it, make the current
 * ones shorter, word them for this job's requirements, or lean on one requirement.
 */
const BulletsModeSchema = Union(
  Literal("make"),
  Literal("shorten"),
  Literal("rephrase"),
  Literal("emphasise")
);

export const BulletsRequestSchema = Object({
  itemId: String,
  mode: BulletsModeSchema,

  /** What the job asks for (from the job's tailor record) */
  requirements: Array(String).optional(),

  /** "emphasise": the one requirement to lean on */
  focus: String.optional(),

  /** The job's current bullets of the item, for every mode but "make" */
  current: Array(String).optional(),
});

/** What the model sends back (loose) */
export const RawBulletsSchema = Object({ bullets: Array(String) });

export const BulletsResultSchema = Object({
  itemId: String,
  bullets: Array(
    Object({
      text: String,

      /** What in the text is not in the description (set by the server, never by the model) */
      flags: Array(String),
    })
  ),
});

export type BulletsMode = Static<typeof BulletsModeSchema>;
export type BulletsRequest = Static<typeof BulletsRequestSchema>;
export type BulletsResult = Static<typeof BulletsResultSchema>;

export const MAX_GENERATED_BULLETS = 8;
export const MAX_BULLETS_REQUIREMENTS = 30;
export const MAX_CURRENT_BULLETS = 20;
