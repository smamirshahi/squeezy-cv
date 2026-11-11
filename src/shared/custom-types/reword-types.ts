import { Array, Literal, Object, Static, String, Union } from "runtypes";

/** Ready-made requests for the wording of one text (a summary, a description): shorter, longer, or fitted to the job's keywords */
const RewordModeSchema = Union(
  Literal("shorten"),
  Literal("rephrase"),
  Literal("longer"),
  Literal("emphasise")
);

export const RewordRequestSchema = Object({
  itemId: String,

  /** The field to reword, e.g. "description" or "text" (the summary) */
  field: String,
  mode: RewordModeSchema,

  /** What the job asks for (from "Analyse job description"); "rephrase" uses it */
  requirements: Array(String).optional(),

  /** "emphasise": the requirement(s) to lean on */
  focus: Union(String, Array(String)).optional(),
});

/** What the model sends back (loose) */
export const RawRewordSchema = Object({ text: String });

export const RewordResultSchema = Object({
  itemId: String,
  field: String,
  text: String,

  /** What in the text is not in the original (set by the server, never by the model) */
  flags: Array(String),
});

export type RewordMode = Static<typeof RewordModeSchema>;
export type RewordRequest = Static<typeof RewordRequestSchema>;
export type RewordResult = Static<typeof RewordResultSchema>;

export const MAX_REWORD_REQUIREMENTS = 40;
