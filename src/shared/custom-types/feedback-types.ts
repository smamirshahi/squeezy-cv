import { Literal, Object, Static, String, Union } from "runtypes";

const FeedbackKindSchema = Union(
  Literal("feedback"),
  Literal("bug"),
  Literal("feature")
);

const FeedbackMoodSchema = Union(
  Literal("happy"),
  Literal("neutral"),
  Literal("sad")
);

/** What the person writes: one kind, an optional mood (feedback only) and one note. Nothing else is sent. */
export const FeedbackRequestSchema = Object({
  kind: FeedbackKindSchema,
  mood: FeedbackMoodSchema.optional(),
  note: String,

  /** Version, browser and page, only when the person ticked "Include app info" */
  appInfo: String.optional(),
});

export type FeedbackKind = Static<typeof FeedbackKindSchema>;
export type FeedbackMood = Static<typeof FeedbackMoodSchema>;
export type FeedbackRequest = Static<typeof FeedbackRequestSchema>;

export const MAX_FEEDBACK_NOTE_LENGTH = 4000;

/** Bug and feature notes need a few words, so one-word reports do not become issues */
export const MIN_DETAILED_NOTE_LENGTH = 10;
export const MAX_FEEDBACK_APP_INFO_LENGTH = 500;
