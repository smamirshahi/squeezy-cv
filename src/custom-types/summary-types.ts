import { Static, String } from "runtypes";

/** The professional summary of the applicant */
export const ProfessionalSummarySchema = String;

export type ProfessionalSummary = Static<typeof ProfessionalSummarySchema>;
