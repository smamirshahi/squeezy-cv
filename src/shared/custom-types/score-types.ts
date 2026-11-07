import { Array, Number, Object, Static, String } from "runtypes";

/** What is sent to score every item against an advert. The CV itself is read from the saved vault on the server. */
export const ScoreRequestSchema = Object({ jobAd: String });

/** What the model may answer for one section: a score and a short reason per item (loose) */
export const RawScoreSchema = Object({
  scores: Array(
    Object({
      id: String,
      relevance: Number,
      reason: String.optional(),
    })
  ),
});

export const ScoreResultSchema = Object({
  /** One entry per item that was scored, relevance 0-100 */
  scores: Array(Object({ itemId: String, relevance: Number, reason: String })),
  warnings: Array(String),
});

export type ScoreResult = Static<typeof ScoreResultSchema>;

/** Items sent to the model in one call; bigger sections are split */
export const SCORE_BATCH_SIZE = 25;
