/** The dimension of A4 paper in mm */
export const A4_DIMENSION_MM = {
  width: 210,
  height: 297,
};

/** All the font sizes in format of type */
export type WordFontSize =
  | "8pt"
  | "9pt"
  | "10pt"
  | "11pt"
  | "12pt"
  | "13pt"
  | "14pt"
  | "16pt"
  | "18pt"
  | "20pt";

export const WORD_FONT_SIZE_OPTIONS: WordFontSize[] = [
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

/** The font weights */
export type WordFontWeight =
  /** Corresponds to normal in Microsoft Word */
  | "400"
  /** Corresponds to Bold in Microsoft Word */
  | "700";

export const WORD_FONT_WEIGHT_OPTIONS: WordFontWeight[] = ["400", "700"];

/** All the available fonts */
export type AvailableFonts =
  | "headingLg"
  | "headingMd"
  | "headingSm"
  | "bodyLg"
  | "bodyMd"
  | "bodySm"
  | "bulletText";

export const AVAILABLE_FONT_OPTIONS: AvailableFonts[] = [
  "headingLg",
  "headingMd",
  "headingSm",
  "bodyLg",
  "bodyMd",
  "bodySm",
  "bulletText",
];

export type FontStyle = {
  fontSize: WordFontSize;
  fontWeight: WordFontWeight;
  color: string;
};

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
};
