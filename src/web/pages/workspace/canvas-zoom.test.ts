import { describe, expect, it } from "vitest";
import { fitWidthZoom } from "@pages/workspace/canvas-zoom";
import { ZOOM_MAX, ZOOM_MIN, clampZoom } from "@store/app/app-slice";

describe("canvas zoom", () => {
  it("stays within its limits and in whole percents", () => {
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
    expect(clampZoom(9)).toBe(ZOOM_MAX);
    expect(clampZoom(0.8000000001)).toBe(0.8);
  });

  it("fits the page to a canvas width, within the limits", () => {
    expect(fitWidthZoom(794 + 48)).toBe(1);
    expect(fitWidthZoom(100)).toBe(ZOOM_MIN);
    expect(fitWidthZoom(5000)).toBe(ZOOM_MAX);
  });
});
