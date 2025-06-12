import {
  AVAILABLE_FONT_OPTIONS,
  AvailableFonts,
  WORD_FONT_SIZE_OPTIONS,
  WORD_FONT_WEIGHT_OPTIONS,
  WordFontSize,
  WordFontWeight,
} from "@custom-styles/custom-styles";
import { SkillItem } from "@custom-types/skill-types";

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

export function isValidFont(value: string): value is AvailableFonts {
  return AVAILABLE_FONT_OPTIONS.includes(value as AvailableFonts);
}

export function isWordFontSize(value: string): value is WordFontSize {
  return WORD_FONT_SIZE_OPTIONS.includes(value as WordFontSize);
}

export function isWordFontWeight(value: string): value is WordFontWeight {
  return WORD_FONT_WEIGHT_OPTIONS.includes(value as WordFontWeight);
}
