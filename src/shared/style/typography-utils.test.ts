import { describe, expect, it } from "vitest";
import {
  contrastOnWhite,
  hasEnoughContrast,
  isValidHex,
  normaliseHex,
  stepFontSize,
} from "@shared/style/typography-utils";

describe("hex colours", () => {
  it("accepts 3 and 6 digit colours", () => {
    expect(isValidHex("#555")).toBe(true);
    expect(isValidHex("#B8400D")).toBe(true);
    expect(isValidHex("#55")).toBe(false);
    expect(isValidHex("red")).toBe(false);
  });

  it("normalises to 6 lower case digits and a hash", () => {
    expect(normaliseHex("#ABC")).toBe("#aabbcc");
    expect(normaliseHex("B8400D")).toBe("#b8400d");
    expect(normaliseHex("#12")).toBeUndefined();
  });
});

describe("contrast", () => {
  it("is 21 for black and 1 for white", () => {
    expect(contrastOnWhite("#000000")).toBeCloseTo(21, 0);
    expect(contrastOnWhite("#ffffff")).toBeCloseTo(1, 1);
  });

  it("passes dark greys and fails light ones", () => {
    expect(hasEnoughContrast("#555555")).toBe(true);
    expect(hasEnoughContrast("#767676")).toBe(true);
    expect(hasEnoughContrast("#777777")).toBe(false);
    expect(hasEnoughContrast("#999999")).toBe(false);
  });
});

describe("stepFontSize", () => {
  it("moves to the neighbouring size", () => {
    expect(stepFontSize("10pt", 1)).toBe("11pt");
    expect(stepFontSize("14pt", 1)).toBe("16pt");
    expect(stepFontSize("10pt", -1)).toBe("9pt");
  });

  it("stays at the ends", () => {
    expect(stepFontSize("20pt", 1)).toBe("20pt");
    expect(stepFontSize("8pt", -1)).toBe("8pt");
  });
});
