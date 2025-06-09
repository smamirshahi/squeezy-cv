import {
  BulletPoint,
  Education,
  Experience,
  SkillCategory,
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
  | "bulletText"
  | "captionText";

export const TypographyVariant: Record<AvailableFonts, FontStyle> = {
  headingLg: {
    fontSize: "16pt",
    fontWeight: 700,
    color: "#000000",
  },
  headingMd: {
    fontSize: "14pt",
    fontWeight: 700,
    color: "#000000",
  },
  headingSm: {
    fontSize: "12pt",
    fontWeight: 400,
    color: "#000000",
  },
  bodyLg: {
    fontSize: "10pt",
    fontWeight: 400,
    color: "#000000",
  },
  bulletText: {
    fontSize: "9pt",
    fontWeight: 400,
    color: "#000000",
  },
  captionText: {
    fontSize: "8pt",
    fontWeight: 400,
    color: "#000000",
  },
};
