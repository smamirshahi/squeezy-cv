import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_HINT,
  fieldSpecsFor,
  fromMonthValue,
  toMonthValue,
} from "@shared/vault/item-fields";

describe("fieldSpecsFor awards, interests and skills", () => {
  it("gives awards a title, issuer, date, short description and link", () => {
    expect(fieldSpecsFor("awards").map((f) => f.key)).toEqual([
      "title",
      "issuer",
      "date",
      "description",
      "link",
    ]);
  });

  it("gives interests a title line and a multiline detail", () => {
    const specs = fieldSpecsFor("interests");
    expect(specs.map((f) => f.key)).toEqual(["title", "detail"]);
    expect(specs[1].kind).toBe("multiline");
  });

  it("offers category suggestions on a skills group", () => {
    const spec = fieldSpecsFor("skills")[0];
    expect(spec.key).toBe("category");
    expect(spec.suggestions).toContain("AI-assisted development");
  });
});

describe("fieldSpecsFor", () => {
  it("uses the keys the page draws", () => {
    expect(fieldSpecsFor("experience").map((f) => f.key)).toEqual([
      "jobTitle",
      "company",
      "location",
      "startDate",
      "endDate",
      "link",
      "description",
    ]);
    expect(fieldSpecsFor("education").map((f) => f.key)).toContain("institute");
    expect(fieldSpecsFor("education").map((f) => f.key)).toContain("link");
    expect(fieldSpecsFor("projects").map((f) => f.key)).toContain(
      "description"
    );
  });

  it("puts the same hint on every description field", () => {
    for (const type of ["experience", "education", "projects"] as const) {
      const spec = fieldSpecsFor(type).find((f) => f.key === "description");
      expect(spec?.hint).toBe(DESCRIPTION_HINT);
    }
  });

  it("gives experience and education a free-text description", () => {
    for (const type of ["experience", "education"] as const) {
      const spec = fieldSpecsFor(type).find((f) => f.key === "description");
      expect(spec?.kind).toBe("multiline");
    }
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
