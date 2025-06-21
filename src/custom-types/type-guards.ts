import { SectionId } from "@components/drag-and-drop/dnd-kit-types";
import {
  AVAILABLE_FONT_OPTIONS,
  WORD_FONT_SIZE_OPTIONS,
  WORD_FONT_WEIGHT_OPTIONS,
} from "@custom-styles/custom-styles";
import { SkillItem } from "@custom-types/skill-types";
import {
  FontSize,
  FontWeight,
  AvailableFonts,
} from "@custom-types/styles-types";

/** Check if the rating is accepted */
export function isRatingAcceptable(
  rating: number | null
): rating is SkillItem["rating"] {
  return (
    rating !== null &&
    rating >= 0 &&
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    rating <= 5 &&
    Number.isInteger(rating * 2)
  );
}

/** Whether the font is a valid one */
export function isValidFont(value: string): value is AvailableFonts {
  return AVAILABLE_FONT_OPTIONS.includes(value as AvailableFonts);
}

/** Whether the font size is a valid one */
export function isValidFontSize(value: string): value is FontSize {
  return WORD_FONT_SIZE_OPTIONS.includes(value as FontSize);
}

/** Whether the font weight is a valid one */
export function isValidFontWeight(value: string): value is FontWeight {
  return WORD_FONT_WEIGHT_OPTIONS.includes(value as FontWeight);
}

/** Check if the value is a valid SectionId */
export function isIdSectionId(value: unknown): value is SectionId {
  return (
    typeof value === "string" &&
    [
      "personalInfo",
      "contactInfo",
      "summary",
      "experiences",
      "educations",
      "skills",
    ].includes(value)
  );
}
