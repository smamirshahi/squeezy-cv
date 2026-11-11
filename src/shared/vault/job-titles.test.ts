import { describe, expect, it } from "vitest";
import { MIN_TITLES_TO_CHOOSE, jobTitlesOf } from "@shared/vault/job-titles";

describe("jobTitlesOf", () => {
  it("lists the main title first, then the others, once each and trimmed", () => {
    expect(
      jobTitlesOf({
        fullName: "A",
        headline: " Software Developer ",
        headlineOptions: ["Frontend developer", "Software Developer", " "],
      })
    ).toEqual(["Software Developer", "Frontend developer"]);
  });

  it("is empty without titles", () => {
    expect(jobTitlesOf({ fullName: "A" })).toEqual([]);
  });

  it("a choice needs two titles", () => {
    expect(MIN_TITLES_TO_CHOOSE).toBe(2);
  });
});
