import { Education, Experience, SkillCategory } from "@custom-types/json-types";
import { CvDataState } from "@store/cv-data/cv-data-slice";

export function findExperience(
  state: CvDataState,
  id: string
): Experience | undefined {
  return state.data.experiences.find((exp) => exp.id === id);
}

export function findEducation(
  state: CvDataState,
  id: string
): Education | undefined {
  return state.data.educations.find((edu) => edu.id === id);
}

export function findSkill(
  state: CvDataState,
  id: string
): SkillCategory | undefined {
  return state.data.skills.find((skill) => skill.id === id);
}
