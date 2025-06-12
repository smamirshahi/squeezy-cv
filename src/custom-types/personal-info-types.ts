import { Object, Static, String } from "runtypes";

export const PersonalInfoSchema = Object({
  /** The name of the applicant */
  name: String,

  /** The job title of the applicant */
  jobTitle: String,
});

export type PersonalInfo = Static<typeof PersonalInfoSchema>;
