import { describe, expect, it } from "vitest";
import { computeFitMetrics } from "@shared/layout/fit-metrics";

const base = { pageHeight: 1000, pageLimit: 1, lineHeightPx: 20 };

describe("computeFitMetrics", () => {
  it("reports the percentage used and no lines over when it fits", () => {
    expect(computeFitMetrics({ ...base, totalHeight: 920 })).toEqual({
      usedPercent: 92,
      linesOver: 0,
      isOverflowing: false,
    });
  });

  it("counts started lines over the limit", () => {
    expect(computeFitMetrics({ ...base, totalHeight: 1105 })).toEqual({
      usedPercent: 111,
      linesOver: 6,
      isOverflowing: true,
    });
  });

  it("uses all allowed pages for the percentage", () => {
    expect(
      computeFitMetrics({ ...base, pageLimit: 2, totalHeight: 1000 })
    ).toMatchObject({ usedPercent: 50, linesOver: 0 });
  });

  it("does not divide by a zero line height", () => {
    expect(
      computeFitMetrics({ ...base, lineHeightPx: 0, totalHeight: 1003 })
        .linesOver
    ).toBe(3);
  });
});
