import {
  AvailableFonts,
  Colors,
  FontStyle,
  Style,
} from "@custom-types/styles-types";

/** The colours used when nothing is chosen */
export const DEFAULT_COLORS: Colors = {
  text: "#333333",
  secondary: "#555555",
};

/** The colours of a style; a file from before the colour card falls back to its old text colours */
export function colorsOf(style: Style): Colors {
  return {
    text: style.colors?.text ?? style.typography.bodyMd.color,
    secondary: style.colors?.secondary ?? style.typography.bodySm.color,
    accent: style.colors?.accent,
  };
}

/** The colour of section titles and symbols: the accent, or the text colour without one */
export function accentOf(colors: Colors): string {
  return colors.accent ?? colors.text;
}

/**
 * The 5 styles people can set (size and weight); every other style borrows from one of them.
 * Headline, bullets and icons follow the body style.
 */
const SIZE_FROM: Record<AvailableFonts, AvailableFonts> = {
  headingLg: "headingLg",
  headingMd: "headingMd",
  headingSm: "headingSm",
  bodyLg: "bodyMd",
  bodyMd: "bodyMd",
  bodySm: "bodySm",
  bulletText: "bodyMd",
  icon: "bodyMd",
};

/** The colour role of each style */
function colorFor(variant: AvailableFonts, colors: Colors): string {
  switch (variant) {
    case "bodySm":
      return colors.secondary;
    case "headingMd":
    case "icon":
      return accentOf(colors);
    default:
      return colors.text;
  }
}

/** Every style resolved to size, weight and colour: what the page, the preview and the PDF draw */
export function resolveTypography(
  style: Style
): Record<AvailableFonts, FontStyle> {
  const colors = colorsOf(style);
  const entries = (Object.keys(SIZE_FROM) as AvailableFonts[]).map(
    (variant) => {
      const source = style.typography[SIZE_FROM[variant]];
      return [
        variant,
        {
          fontSize: source.fontSize,
          fontWeight: variant === "icon" ? "400" : source.fontWeight,
          color: colorFor(variant, colors),
        },
      ] as const;
    }
  );
  return Object.fromEntries(entries) as Record<AvailableFonts, FontStyle>;
}
