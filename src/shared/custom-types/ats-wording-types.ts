import { Array, Object, Static, String } from "runtypes";

/** Most terms and texts one request carries (the model sees a short, focused task) */
export const MAX_ATS_TERMS = 30;
export const MAX_ATS_TEXTS = 10;

/** The keywords the ATS score found missing or worded differently, to work into the CV's own words */
export const AtsWordingRequestSchema = Object({
  terms: Array(String),

  /**
   * The terms the CV already says in other words ("React" for "React.js"): spelling them the
   * advert's way adds nothing new, so the check for invented words lets them through. A term not
   * listed here is one the CV lacks, and putting it in is flagged.
   */
  reworded: Array(String).optional(),
});

/** What the model sends back (loose): new wording for some texts, and the terms it could not place honestly */
export const RawAtsWordingSchema = Object({
  suggestions: Array(Object({ itemId: String, field: String, text: String })),
  unplaced: Array(String),
});

export const AtsWordingResultSchema = Object({
  suggestions: Array(
    Object({
      itemId: String,
      field: String,

      /** A short name of the item, for the list */
      label: String,

      /** The saved text, to show next to the new one */
      original: String,
      text: String,

      /** What in the new text is not in the original (set by the server, never by the model) */
      flags: Array(String),
    })
  ),

  /** Terms the texts do not support, so they were left out (the user may still add them where true) */
  unplaced: Array(String),
});

export type AtsWordingRequest = Static<typeof AtsWordingRequestSchema>;
export type AtsWordingResult = Static<typeof AtsWordingResultSchema>;
