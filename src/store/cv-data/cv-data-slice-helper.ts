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

export type FontStyle = {
  fontSize: string;
  fontWeight: number;
  color: string;
};

export type AvailableFonts =
  | "headingLg"
  | "headingMd"
  | "headingSm"
  | "bodyLg"
  | "bodyMd"
  | "bodySm"
  | "bulletText";

export const TypographyVariant: Record<AvailableFonts, FontStyle> = {
  headingLg: {
    fontSize: "18pt",
    fontWeight: 700,
    color: "#222222",
  },
  headingMd: {
    fontSize: "13pt",
    fontWeight: 700,
    color: "#333333",
  },
  headingSm: {
    fontSize: "11pt",
    fontWeight: 700,
    color: "#222222",
  },
  bodyLg: {
    fontSize: "13pt",
    fontWeight: 400,
    color: "#444444",
  },
  bodyMd: {
    fontSize: "10pt",
    fontWeight: 400,
    color: "#555555",
  },
  bodySm: {
    fontSize: "9pt",
    fontWeight: 400,
    color: "#777777",
  },
  bulletText: {
    fontSize: "9pt",
    fontWeight: 400,
    color: "#333333",
  },
};
