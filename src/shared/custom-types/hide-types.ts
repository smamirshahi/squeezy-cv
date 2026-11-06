import { Array, Number, Object, Static, String } from "runtypes";

/** What is sent to ask the AI which items to hide so the CV fits. No name or contact details. */
export const HideRequestSchema = Object({
  /** How many lines the CV is over its page limit */
  linesOver: Number,

  /** The visible items that could be hidden, with what each would save */
  candidates: Array(
    Object({
      itemId: String,
      label: String,
      section: String,

      /** Lines the item takes on the page now */
      lines: Number,

      /** 0-100, from tailoring (50 when unscored) */
      relevance: Number,
    })
  ),

  /** The job this variant was tailored for, when there is one */
  jobTitle: String.optional(),
  mustHave: Array(String).optional(),
});

/** What the model may answer: the items to hide first, most expendable first */
export const RawHideSchema = Object({
  hide: Array(Object({ id: String, reason: String.optional() })),
});

export const HideResultSchema = Object({
  suggestions: Array(Object({ itemId: String, reason: String })),
  warnings: Array(String),
});

export type HideRequest = Static<typeof HideRequestSchema>;
export type HideResult = Static<typeof HideResultSchema>;

export const MAX_HIDE_CANDIDATES = 100;
