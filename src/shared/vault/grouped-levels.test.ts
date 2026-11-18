import { describe, expect, it } from "vitest";
import { groupedLevelLabels } from "@shared/vault/grouped-levels";

const group = (...ratings: (number | undefined)[]): { rating?: number }[] =>
  ratings.map((rating) => (rating === undefined ? {} : { rating }));

describe("levels in grouped rows", () => {
  it("off shows no level", () => {
    expect(groupedLevelLabels(group(4, 3), "off", "Frameworks")).toEqual([
      undefined,
      undefined,
    ]);
  });

  it("all shows every level and skips skills without one", () => {
    expect(groupedLevelLabels(group(4, 3, undefined), "all", "Core")).toEqual([
      "Advanced",
      "Proficient",
      undefined,
    ]);
  });

  it("exceptions marks only the skills that differ from the usual level", () => {
    expect(groupedLevelLabels(group(4, 4, 2, 4), "exceptions", "Core")).toEqual(
      [undefined, undefined, "Working", undefined]
    );
  });

  it("exceptions marks nothing when two levels tie or no skill has a level", () => {
    expect(groupedLevelLabels(group(4, 2), "exceptions", "Core")).toEqual([
      undefined,
      undefined,
    ]);
    expect(groupedLevelLabels(group(undefined, 0), "exceptions")).toEqual([
      undefined,
      undefined,
    ]);
  });

  it("half steps count as the level below", () => {
    expect(groupedLevelLabels(group(4.5, 4, 3), "exceptions", "Core")).toEqual([
      undefined,
      undefined,
      "Proficient",
    ]);
  });

  it("a languages group always shows every level, with the language words", () => {
    const labels = groupedLevelLabels(
      group(5, 5, 3),
      "exceptions",
      "Languages"
    );
    expect(labels.every((label) => label !== undefined)).toBe(true);
    expect(groupedLevelLabels(group(5, 5), "off", "Languages")).toEqual([
      undefined,
      undefined,
    ]);
  });
});
