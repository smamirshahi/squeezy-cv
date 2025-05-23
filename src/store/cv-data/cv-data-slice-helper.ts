import {
  Education,
  Experience,
  SkillCategory,
} from "@src/custom-types/json-types";
import { cvDataState } from "./cv-data-slice";

export function findExperience(
  state: cvDataState,
  id: string
): Experience | undefined {
  return state.data.experiences.find((exp) => exp.id === id);
}

export function findEducation(
  state: cvDataState,
  id: string
): Education | undefined {
  return state.data.educations.find((edu) => edu.id === id);
}

export function findSkill(
  state: cvDataState,
  id: string
): SkillCategory | undefined {
  return state.data.skills.find((skill) => skill.id === id);
}
