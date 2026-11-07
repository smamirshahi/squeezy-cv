import { FontSize } from "@custom-types/styles-types";

/** The sizes a style can take, smallest first */
export const FONT_SIZES: readonly FontSize[] = [
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

/** Minimum contrast of text on white (WCAG AA for normal text) */
export const MIN_CONTRAST = 4.5;

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const SHORT_HEX_LENGTH = 3;
const BYTE_MAX = 255;
const HEX_RADIX = 16;
const LINEAR_THRESHOLD = 0.03928;
const LINEAR_OFFSET = 0.055;
const LINEAR_DIVISOR = 1.055;
const LINEAR_GAMMA = 2.4;
const LINEAR_LOW_DIVISOR = 12.92;
const LUMA_RED = 0.2126;
const LUMA_GREEN = 0.7152;
const LUMA_BLUE = 0.0722;
/** Where the red, green and blue digits start in `#rrggbb` */
const RED_GREEN_BLUE_STARTS = [1, 3, 5];
const CONTRAST_OFFSET = 0.05;

/** Whether the text is a colour like `#555` or `#555555` */
export function isValidHex(text: string): boolean {
  return HEX_PATTERN.test(text.trim());
}

/** `#abc` or `ABCDEF` as `#aabbcc`; undefined when it is not a colour. Accepts a missing `#` */
export function normaliseHex(text: string): string | undefined {
  const trimmed = text.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!isValidHex(withHash)) {
    return undefined;
  }
  const digits = withHash.slice(1).toLowerCase();
  if (digits.length === SHORT_HEX_LENGTH) {
    return `#${[...digits].map((digit) => digit + digit).join("")}`;
  }
  return `#${digits}`;
}

function channelLuminance(value: number): number {
  const channel = value / BYTE_MAX;
  return channel <= LINEAR_THRESHOLD
    ? channel / LINEAR_LOW_DIVISOR
    : ((channel + LINEAR_OFFSET) / LINEAR_DIVISOR) ** LINEAR_GAMMA;
}

function luminance(hex: string): number {
  const normal = normaliseHex(hex) ?? "#000000";
  const [red, green, blue] = RED_GREEN_BLUE_STARTS.map((start) =>
    channelLuminance(parseInt(normal.slice(start, start + 2), HEX_RADIX))
  );
  return LUMA_RED * red + LUMA_GREEN * green + LUMA_BLUE * blue;
}

/** WCAG contrast ratio (1 to 21) of a text colour on white */
export function contrastOnWhite(hex: string): number {
  return (1 + CONTRAST_OFFSET) / (luminance(hex) + CONTRAST_OFFSET);
}

/** Whether the colour is readable on white */
export function hasEnoughContrast(hex: string): boolean {
  return contrastOnWhite(hex) >= MIN_CONTRAST;
}

/** The next larger (`1`) or smaller (`-1`) size; stays at the ends */
export function stepFontSize(size: FontSize, direction: 1 | -1): FontSize {
  const index = FONT_SIZES.indexOf(size);
  const next = Math.min(
    FONT_SIZES.length - 1,
    Math.max(0, (index === -1 ? 0 : index) + direction)
  );
  return FONT_SIZES[next];
}
