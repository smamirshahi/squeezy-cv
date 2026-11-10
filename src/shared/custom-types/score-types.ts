import { Array, Number, Object, Static, String } from "runtypes";
import { RequirementsSchema } from "@custom-types/requirements-types";

/** What is sent to analyse an advert: just its text */
export const AnalyseRequestSchema = Object({ jobAd: String });

/** What is sent to score one section: which one, and what the advert asks for (from "Analyse job description") */
export const ScoreSectionRequestSchema = Object({
  sectionId: String,
  requirements: RequirementsSchema,
});

const RawBulletScoreSchema = Object({
  id: String,
  relevance: Number,
  reason: String.optional(),
});

/** What the model may answer for one section: a score and reason per item, and per bullet (loose) */
export const RawScoreSchema = Object({
  scores: Array(
    Object({
      id: String,
      relevance: Number,
      reason: String.optional(),
      bullets: Array(RawBulletScoreSchema).optional(),
    })
  ),
});

export const ScoreResultSchema = Object({
  /** One entry per item that was scored (the category, for skills), relevance 0-100, with its bullets (skills) */
  scores: Array(
    Object({
      itemId: String,
      relevance: Number,
      reason: String,
      bullets: Array(
        Object({ bulletId: String, relevance: Number, reason: String })
      ),
    })
  ),
  warnings: Array(String),
});

export const AnalyseResultSchema = Object({
  requirements: RequirementsSchema,
  warnings: Array(String),
});

export type ScoreResult = Static<typeof ScoreResultSchema>;
export type AnalyseResult = Static<typeof AnalyseResultSchema>;

/** Items sent to the model in one call; bigger sections are split */
export const SCORE_BATCH_SIZE = 25;
