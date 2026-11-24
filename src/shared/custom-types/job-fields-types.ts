import { Object, Static, String } from "runtypes";

/** The longest pasted job page accepted, in characters */
export const MAX_JOB_PAGE_LENGTH = 30_000;

/** What is sent to fill the job from a pasted job page: just its text */
export const JobFieldsRequestSchema = Object({ text: String });

/** What is sent to read a job link: just the address */
export const JobLinkRequestSchema = Object({ url: String });

/** What the model answers; each part is empty when the page does not say */
export const JobFieldsSchema = Object({
  company: String,
  role: String,
  location: String,
  /** The job description only, as the page words it (no menus, no other jobs) */
  advert: String,
  /** "onsite", "hybrid" or "remote"; small models may leave it out */
  workMode: String.optional(),
  /** "fullTime", "partTime", "contract", "freelance" or "internship" */
  employmentType: String.optional(),
});

export type JobFields = Static<typeof JobFieldsSchema>;
