import { describe, expect, it } from "vitest";
import {
  fieldSpecsFor,
  fromMonthValue,
  toMonthValue,
} from "@shared/vault/item-fields";

describe("fieldSpecsFor", () => {
  it("uses the keys the page draws", () => {
    expect(fieldSpecsFor("experience").map((f) => f.key)).toEqual([
      "jobTitle",
      "company",
      "location",
      "startDate",
      "endDate",
      "link",
    ]);
    expect(fieldSpecsFor("education").map((f) => f.key)).toContain("institute");
    expect(fieldSpecsFor("education").map((f) => f.key)).toContain("link");
    expect(fieldSpecsFor("projects").map((f) => f.key)).toContain(
      "description"
    );
  });

  it("marks only the end date as one that can be 'Present'", () => {
    const ends = fieldSpecsFor("experience").filter((f) => f.isEnd);
    expect(ends.map((f) => f.key)).toEqual(["endDate"]);
  });
});

describe("month values", () => {
  it("converts between the input's value and the stored day", () => {
    expect(toMonthValue("2021-03-15")).toBe("2021-03");
    expect(toMonthValue("")).toBe("");
    expect(toMonthValue(undefined)).toBe("");
    expect(fromMonthValue("2021-03")).toBe("2021-03-01");
    expect(fromMonthValue("2021")).toBe("");
    expect(fromMonthValue("")).toBe("");
  });
});
