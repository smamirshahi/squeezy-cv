import { AvailableFonts, FontStyle } from "@custom-types/styles-types";

/** Space between the edge of the paper and the text, in mm, for each margin setting */
export const PAPER_MARGIN_MM = {
  narrow: 10,
  normal: 20,
} as const;

/** Gaps in px that auto-fit can scale, see `spaced` */
export const GAP_PX = {
  item: 10,
  sectionTop: 16,
  bullet: 2,
} as const;

/**
 * A gap in px that auto-fit can shrink or grow: the paper sets `--cv-spacing` (1 = normal).
 */
export function spaced(px: number): string {
  return `calc(${px}px * var(--cv-spacing, 1))`;
}

/** The dimension of A4 paper in mm */
export const A4_DIMENSION_MM = {
  width: 210,
  height: 297,
};

export const TypographyVariant: Record<AvailableFonts, FontStyle> = {
  headingLg: {
    fontSize: "20pt",
    fontWeight: "700",
    color: "#222222",
  },
  headingMd: {
    fontSize: "12pt",
    fontWeight: "700",
    color: "#333333",
  },
  headingSm: {
    fontSize: "11pt",
    fontWeight: "700",
    color: "#222222",
  },
  bodyLg: {
    fontSize: "13pt",
    fontWeight: "400",
    color: "#444444",
  },
  bodyMd: {
    fontSize: "10pt",
    fontWeight: "400",
    color: "#555555",
  },
  bodySm: {
    fontSize: "9pt",
    fontWeight: "400",
    color: "#767676",
  },
  bulletText: {
    fontSize: "9pt",
    fontWeight: "400",
    color: "#333333",
  },
  icon: {
    fontSize: "10pt",
    fontWeight: "400",
    color: "#333333",
  },
};
