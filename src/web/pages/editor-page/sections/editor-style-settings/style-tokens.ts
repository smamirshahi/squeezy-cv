import { AvailableFonts } from "@custom-types/styles-types";

interface StyleTokenInfo {
  /** The token name, also shown in the preview */
  variant: AvailableFonts;

  /** What the style is for, in a few words */
  use: string;

  /** Where on the page it appears */
  where: string;

  /** The text of the sample in the table */
  sample: string;
}

/** The 8 styles in table order, with what each one is for */
export const STYLE_TOKENS: readonly StyleTokenInfo[] = [
  {
    variant: "headingLg",
    use: "Your name",
    where: "Name at the top of the page",
    sample: "Alex Morgan",
  },
  {
    variant: "headingMd",
    use: "Section titles",
    where: "Experience, Education, Skills",
    sample: "Work Experience",
  },
  {
    variant: "headingSm",
    use: "Entry titles",
    where: "Job title and company, degree",
    sample: "Senior Software Developer",
  },
  {
    variant: "bodyLg",
    use: "Headline",
    where: "Line under your name",
    sample: "Frontend engineer, React and TypeScript",
  },
  {
    variant: "bodyMd",
    use: "Body text",
    where: "Summary and descriptions",
    sample: "Builds accessible interfaces for finance teams.",
  },
  {
    variant: "bodySm",
    use: "Small text",
    where: "Dates, locations, contact line",
    sample: "Dec 2018 to Present · Nottingham, UK",
  },
  {
    variant: "bulletText",
    use: "Bullets",
    where: "Achievement lines",
    sample: "Cut page load time by 38%",
  },
  {
    variant: "icon",
    use: "Icons",
    where: "Bullet and skill symbols",
    sample: "● ○",
  },
];

/** Colours offered as one-click presets next to the hex field */
export const COLOR_PRESETS = ["#000000", "#333333", "#555555", "#b8400d"];
