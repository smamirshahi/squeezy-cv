import { Education } from "@custom-types/education-types";
import { Experience } from "@custom-types/experience-types";
import { SkillCategory, SkillItem } from "@custom-types/skill-types";
import { CvDataState } from "@store/cv-data/cv-data-slice";

export function findExperienceById(
  state: CvDataState,
  experienceId: string
): Experience | undefined {
  return state.data.experiences.find((exp) => exp.id === experienceId);
}

// export function findBulletPointById(
//   state: CvDataState,
//   bulletPointId: string
// ): string | undefined {
//   return state.data.experiences
//     .flatMap((experience) => experience.bulletPoints)
//     .find((bulletPoint) => bulletPoint.id === bulletPointId);
// }

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
  skillItemId: string
): SkillItem | undefined {
  return state.data.skills
    .flatMap((skill) => skill.items)
    .find((item) => item.id === skillItemId);
}
