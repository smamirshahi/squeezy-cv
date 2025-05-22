import { Education, Experience } from "@src/types/json-types";
import { ApplicantState } from "./applicant-slice";

export function findExperience(
  state: ApplicantState,
  id: string
): Experience | undefined {
  return state.data.experiences.find((exp) => exp.id === id);
}

export function findEducation(
  state: ApplicantState,
  id: string
): Education | undefined {
  return state.data.educations.find((edu) => edu.id === id);
}
