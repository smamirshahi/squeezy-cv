import { describe, expect, it } from "vitest";
import { hexToHsv, hsvToHex } from "@shared/style/color-convert";

describe("colour conversion", () => {
  it("reads the primary colours", () => {
    expect(hexToHsv("#ff0000")).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv("#00ff00").h).toBe(120);
    expect(hexToHsv("#0000ff").h).toBe(240);
    expect(hexToHsv("#000000")).toEqual({ h: 0, s: 0, v: 0 });
    expect(hexToHsv("#ffffff")).toEqual({ h: 0, s: 0, v: 1 });
  });

  it("writes hue, saturation and value back as hex", () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe("#ff0000");
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe("#00ff00");
    expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe("#0000ff");
    expect(hsvToHex({ h: 0, s: 0, v: 0.2 })).toBe("#333333");
  });

  it("round-trips the palette colours", () => {
    for (const hex of ["#1f3a5f", "#0f5257", "#b8400d", "#767676", "#333333"]) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });
});
