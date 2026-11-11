import { Profile } from "@custom-types/vault-types";

/** The id the score request uses for the job titles, which are not a vault section */
export const JOB_TITLES_SECTION = "job-titles";

/** A choice of job title only exists from this many titles */
export const MIN_TITLES_TO_CHOOSE = 2;

/** The job titles a job can show under the name: the vault's Job Title, then the other titles, once each */
export function jobTitlesOf(profile: Profile): string[] {
  return [
    ...new Set(
      [profile.headline ?? "", ...(profile.headlineOptions ?? [])]
        .map((title) => title.trim())
        .filter((title) => title !== "")
    ),
  ];
}
