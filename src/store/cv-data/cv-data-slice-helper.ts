import { Education } from "@custom-types/education-types";
import { BulletPoint, Experience } from "@custom-types/experience-types";
import { SkillCategory, SkillItem } from "@custom-types/skill-types";
import { CvDataState } from "@store/cv-data/cv-data-slice";

/** Find experience based on ID */
export function findExperienceById(
  state: CvDataState,
  experienceId: string
): Experience | undefined {
  return state.data.experiences.find((exp) => exp.id === experienceId);
}

export function findBulletPointById(
  state: CvDataState,
  experienceId: string,
  bulletPointId: string
): BulletPoint | undefined {
  return state.data.experiences
    .find((exp) => exp.id === experienceId)
    ?.bulletPoints.find((bp) => bp.id === bulletPointId);
}

export function findEducationById(
  state: CvDataState,
  educationId: string
): Education | undefined {
  return state.data.educations.find((edu) => edu.id === educationId);
}

export function findSkillById(
  state: CvDataState,
  skillId: string
): SkillCategory | undefined {
  return state.data.skills.find((skill) => skill.id === skillId);
}

export function findSkillItemById(
  state: CvDataState,
  skillId: string,
  skillItemId: string
): SkillItem | undefined {
  return state.data.skills
    .find((skill) => skill.id === skillId)
    ?.items.find((item) => item.id === skillItemId);
}
