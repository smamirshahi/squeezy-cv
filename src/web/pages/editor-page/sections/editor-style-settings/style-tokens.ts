import { AvailableFonts } from "@custom-types/styles-types";

interface StyleTokenInfo {
  /** The token name, also shown in the preview */
  variant: AvailableFonts;

  /** The name shown in the table */
  name: string;

  /** What the style is for, in a few words */
  use: string;

  /** Where on the page it appears */
  where: string;

  /** The text of the sample in the table */
  sample: string;
}

/** The 5 styles people can set, in table order (headline, bullets and icons follow Body; see `resolveTypography`) */
export const STYLE_TOKENS: readonly StyleTokenInfo[] = [
  {
    variant: "headingLg",
    name: "Name",
    use: "Your name",
    where: "Name at the top of the page",
    sample: "Alex Morgan",
  },
  {
    variant: "headingMd",
    name: "Section heading",
    use: "Section titles",
    where: "Experience, Education, Skills",
    sample: "Work Experience",
  },
  {
    variant: "headingSm",
    name: "Item title",
    use: "Entry titles",
    where: "Job title and company, degree",
    sample: "Senior Software Developer",
  },
  {
    variant: "bodyMd",
    name: "Body",
    use: "Text, bullets, skills",
    where: "Headline, summary, descriptions, bullets, skills and their symbols",
    sample: "Builds accessible interfaces for finance teams.",
  },
  {
    variant: "bodySm",
    name: "Small",
    use: "Dates and contact line",
    where: "Dates, locations, contact line",
    sample: "Dec 2018 to Present · Nottingham, UK",
  },
];

/** The palette rows shown in a colour picker, dark enough to read on white and to print */
export const COLOR_PALETTE: readonly (readonly string[])[] = [
  ["#000000", "#222222", "#333333", "#444444", "#555555", "#666666", "#767676"],
  [
    "#1f3a5f",
    "#1d4e89",
    "#0f5257",
    "#1e5631",
    "#7a1f2b",
    "#4b2e6f",
    "#6b3e1f",
    "#b8400d",
  ],
];

/** The heading of each palette row */
export const PALETTE_LABELS: readonly string[] = ["Greys", "Colours"];
