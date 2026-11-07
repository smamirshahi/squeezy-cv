import { Object, String } from "runtypes";

export const ContactInfoSchema = Object({
  /** The email of the applicant */
  email: String,

  /** The phone number of the applicant */
  phone: String,

  /** The location of the applicant */
  location: String,

  /** The LinkedIn ID of the applicant */
  linkedInId: String,

  /** The GitHub ID profile of the applicant */
  gitHubId: String,
});
