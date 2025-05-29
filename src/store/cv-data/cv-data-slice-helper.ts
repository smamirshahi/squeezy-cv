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

export type FontStyle = {
  fontSize: number;
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
    fontSize: 2,
    fontWeight: 700,
    color: "#000000",
  },
  headingMd: {
    fontSize: 1.5,
    fontWeight: 600,
    color: "#000000",
  },
  headingSm: {
    fontSize: 1.25,
    fontWeight: 500,
    color: "#000000",
  },
  bodyLg: {
    fontSize: 1,
    fontWeight: 400,
    color: "#000000",
  },
  bulletText: {
    fontSize: 0.9,
    fontWeight: 400,
    color: "#000000",
  },
  captionText: {
    fontSize: 0.75,
    fontWeight: 400,
    color: "#777",
  },
};
