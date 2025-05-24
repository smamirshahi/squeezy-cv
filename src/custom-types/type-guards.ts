import { SkillItem } from "./json-types";

/** Check if the rating is accepted */
export function isRatingAcceptable(
  rating: number | null
): rating is SkillItem["rating"] {
  return (
    rating !== null &&
    rating >= 0 &&
    rating <= 5 &&
    Number.isInteger(rating * 2)
  );
}
