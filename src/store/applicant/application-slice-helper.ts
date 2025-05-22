import { Experience } from "@src/types/json-types";
import { ApplicantState } from "./applicant-slice";

export function findExperience(
  state: ApplicantState,
  id: string
): Experience | undefined {
  return state.data.experiences.find((experience) => experience.id === id);
}
