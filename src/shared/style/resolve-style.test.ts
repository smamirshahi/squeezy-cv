import { describe, expect, it } from "vitest";
import {
  accentOf,
  colorsOf,
  DEFAULT_COLORS,
  resolveTypography,
} from "@shared/style/resolve-style";
import { TypographyVariant } from "@custom-styles/custom-styles";
import { Style } from "@custom-types/styles-types";

const base: Style = {
  shouldShowFullContactLinks: true,
  ratingIcon: "star",
  bulletPointIcon: "disc",
  dateFormat: "MMM YYYY",
  typography: TypographyVariant,
  paperMargin: "narrow",
};

describe("resolveTypography", () => {
  it("falls back to the old text colours when a file has no colours", () => {
    const colors = colorsOf(base);
    expect(colors.text).toBe(TypographyVariant.bodyMd.color);
    expect(colors.secondary).toBe(TypographyVariant.bodySm.color);
    expect(colors.accent).toBeUndefined();
  });

  it("gives every style the text colour, the small one the secondary colour", () => {
    const resolved = resolveTypography({ ...base, colors: DEFAULT_COLORS });
    expect(resolved.headingLg.color).toBe(DEFAULT_COLORS.text);
    expect(resolved.bodyMd.color).toBe(DEFAULT_COLORS.text);
    expect(resolved.bulletText.color).toBe(DEFAULT_COLORS.text);
    expect(resolved.bodySm.color).toBe(DEFAULT_COLORS.secondary);
    // no accent: titles and symbols use the text colour
    expect(resolved.headingMd.color).toBe(DEFAULT_COLORS.text);
    expect(resolved.icon.color).toBe(DEFAULT_COLORS.text);
  });

  it("paints section titles and icons with the accent", () => {
    const colors = { ...DEFAULT_COLORS, accent: "#1f3a5f" };
    const resolved = resolveTypography({ ...base, colors });
    expect(resolved.headingMd.color).toBe("#1f3a5f");
    expect(resolved.icon.color).toBe("#1f3a5f");
    expect(resolved.bodyMd.color).toBe(DEFAULT_COLORS.text);
    expect(accentOf(colors)).toBe("#1f3a5f");
  });

  it("makes the headline, bullets and icons follow the body size", () => {
    const typography = {
      ...TypographyVariant,
      bodyMd: { ...TypographyVariant.bodyMd, fontSize: "11pt" as const },
    };
    const resolved = resolveTypography({ ...base, typography });
    expect(resolved.bodyLg.fontSize).toBe("11pt");
    expect(resolved.bulletText.fontSize).toBe("11pt");
    expect(resolved.icon.fontSize).toBe("11pt");
    expect(resolved.headingLg.fontSize).toBe(
      TypographyVariant.headingLg.fontSize
    );
  });
});
