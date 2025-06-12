import {
  BulletPoint,
  Education,
  Experience,
  SkillCategory,
  SkillItem,
} from "@custom-types/json-types";
import { CvDataState } from "@store/cv-data/cv-data-slice";

export function findExperience(
  state: CvDataState,
  experienceId: string
): Experience | undefined {
  return state.data.experiences.find((exp) => exp.id === experienceId);
}

export function findBulletPoint(
  state: CvDataState,
  experienceId: string,
  bulletPointId: string
): BulletPoint | undefined {
  return state.data.experiences
    .find((exp) => exp.id === experienceId)
    ?.bulletPoints.find((bp) => bp.id === bulletPointId);
}

export function findEducation(
  state: CvDataState,
  educationId: string
): Education | undefined {
  return state.data.educations.find((edu) => edu.id === educationId);
}

export function findSkill(
  state: CvDataState,
  skillId: string
): SkillCategory | undefined {
  return state.data.skills.find((skill) => skill.id === skillId);
}

export function findSkillItem(
  state: CvDataState,
  skillId: string,
  skillItemId: string
): SkillItem | undefined {
  return state.data.skills
    .find((skill) => skill.id === skillId)
    ?.items.find((item) => item.id === skillItemId);
}
