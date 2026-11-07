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
