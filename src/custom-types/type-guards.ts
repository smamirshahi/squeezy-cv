import { SkillItem } from "@custom-types/json-types";
import { AvailableFonts } from "@store/cv-data/cv-data-slice-helper";

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

export function isAvailableFont(value: unknown): value is AvailableFonts {
  return (
    typeof value === "string" &&
    [
      "headingLg",
      "headingMd",
      "headingSm",
      "bodyLg",
      "bodyMd",
      "bodySm",
      "bulletText",
    ].includes(value)
  );
}
