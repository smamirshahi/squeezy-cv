import { Array, Literal, Object, Static, String, Union } from "runtypes";

const RewriteModeSchema = Union(
  Literal("shorten"),
  Literal("extend"),
  Literal("rephrase")
);

/** Which alternative wording each mode produces */
export const REWRITE_WORDING = {
  shorten: "short",
  extend: "long",
  rephrase: "formal",
} as const;

export const RewriteRequestSchema = Object({
  itemId: String,
  bulletId: String,
  mode: RewriteModeSchema,

  /** What the job asks for (from the job's tailor record), so a rewording can lean on it */
  requirements: Array(String).optional(),
});

/** What the model sends back (loose) */
export const RawRewriteSchema = Object({ text: String });

export const RewriteResultSchema = Object({
  itemId: String,
  bulletId: String,
  wording: Union(Literal("short"), Literal("long"), Literal("formal")),
  text: String,

  /** What in the new text is not in the CV (set by the server, never by the model) */
  flags: Array(String),
});

export type RewriteMode = Static<typeof RewriteModeSchema>;
export type RewriteRequest = Static<typeof RewriteRequestSchema>;
export type RewriteResult = Static<typeof RewriteResultSchema>;

export const MAX_REWRITE_REQUIREMENTS = 30;
