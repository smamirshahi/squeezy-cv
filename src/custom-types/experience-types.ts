import { Object, String, Array, Static, Boolean } from "runtypes";

export const BulletPointSchema = Object({
  /** Specific ID for the bullet point */
  id: String,

  /** The text of the bullet point */
  text: String,
});

export const ExperienceSchema = Object({
  /** Specific ID for the experience */
  id: String,

  /** The title of the job */
  jobTitle: String,

  /** The company of the work */
  company: String,

  /** The location of job */
  location: String,

  /** The start date of the experience */
  startDate: String,

  /** The end date of the experience. If not available, it means until now */
  endDate: String.optional(),

  /** Bullet points for each experience */
  bulletPoints: Array(BulletPointSchema),

  /** Whether to hide this specific row or now */
  shouldHide: Boolean,
});

export type Experience = Static<typeof ExperienceSchema>;
export type BulletPoint = Static<typeof BulletPointSchema>;
