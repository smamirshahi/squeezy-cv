import {
  AvailableFonts,
  FontSize,
  FontStyle,
  FontWeight,
} from "@custom-types/styles-types";

/** Size of grid in px */
export const GRID_SIZE_PX = 20;

/** Distance between every two sections in px */
export const DISTANCE_BETWEEN_SECTIONS_PX = GRID_SIZE_PX;

/** The dimension of A4 paper in mm */
export const A4_DIMENSION_MM = {
  width: 210,
  height: 297,
};

export const WORD_FONT_SIZE_OPTIONS: FontSize[] = [
  "8pt",
  "9pt",
  "10pt",
  "11pt",
  "12pt",
  "13pt",
  "14pt",
  "16pt",
  "18pt",
  "20pt",
];

export const WORD_FONT_WEIGHT_OPTIONS: FontWeight[] = ["400", "700"];

export const AVAILABLE_FONT_OPTIONS: AvailableFonts[] = [
  "headingLg",
  "headingMd",
  "headingSm",
  "bodyLg",
  "bodyMd",
  "bodySm",
  "bulletText",
  "icon",
];

export const TypographyVariant: Record<AvailableFonts, FontStyle> = {
  headingLg: {
    fontSize: "18pt",
    fontWeight: "700",
    color: "#222222",
  },
  headingMd: {
    fontSize: "13pt",
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
    color: "#777777",
  },
  bulletText: {
    fontSize: "9pt",
    fontWeight: "400",
    color: "#333333",
  },
  icon: {
    fontSize: "20pt",
    fontWeight: "400",
    color: "#1976d2",
  },
};
