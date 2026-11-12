import { describe, expect, it } from "vitest";
import { cleanRequirementList } from "@server/ai/tailor";
import { isGapCoveredByCv } from "@shared/ai/gap-coverage";

describe("cleanRequirementList", () => {
  it("drops one-word advert headings but keeps real requirements", () => {
    expect(
      cleanRequirementList([
        "Essential",
        "desirable:",
        "React",
        "Experience",
        "5 years of TypeScript",
        "",
      ])
    ).toEqual(["React", "5 years of TypeScript"]);
  });
});

describe("isGapCoveredByCv", () => {
  const cv =
    "Built state with Redux Toolkit and React. Wrote Node.js services.";

  it("is true when every key term is in the CV", () => {
    expect(isGapCoveredByCv("Redux Toolkit experience", cv)).toBe(true);
    expect(isGapCoveredByCv("Node.js", cv)).toBe(true);
  });

  it("is false when a key term is missing", () => {
    expect(isGapCoveredByCv("Redux Saga", cv)).toBe(false);
    expect(isGapCoveredByCv("Java", cv)).toBe(false);
  });

  it("matches whole words only", () => {
    expect(isGapCoveredByCv("Java", "JavaScript developer")).toBe(false);
  });

  it("keeps gaps that have no key terms", () => {
    expect(isGapCoveredByCv("strong experience", cv)).toBe(false);
  });
});
