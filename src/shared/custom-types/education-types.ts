import { Object, String, Boolean } from "runtypes";

export const EducationSchema = Object({
  /** Specific ID for the education */
  id: String,

  /** The degree of education */
  degree: String,

  /** The institute of the education */
  institute: String,

  /** The location of education */
  location: String,

  /** The start date of the education */
  startDate: String,

  /** The end date of the education. If not available, it means until now */
  endDate: String.optional(),

  /** The title of the education dissertation */
  dissertationTitle: String.optional(),

  /** Whether to hide this specific row or now */
  shouldShow: Boolean,
});
