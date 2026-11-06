import { Array, Object, Static, String } from "runtypes";

/** What a job advert asks for (step 1 of tailoring) */
export const RequirementsSchema = Object({
  jobTitle: String,

  /** e.g. "junior", "mid", "senior", "lead"; empty if the advert does not say */
  seniority: String,

  /** Skills and experience the advert insists on */
  mustHave: Array(String),

  /** Skills and experience that are a plus */
  niceToHave: Array(String),

  /** Words an applicant-tracking system is likely to look for */
  keywords: Array(String),
});

export type Requirements = Static<typeof RequirementsSchema>;
