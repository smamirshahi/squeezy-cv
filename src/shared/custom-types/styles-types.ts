import { Object, String, Static, Union, Literal, Boolean } from "runtypes";

const SideSchema = Union(
  Literal("fullWidth"),
  Literal("left"),
  Literal("right")
);

const FontSizeSchema = Union(
  Literal("8pt"),
  Literal("9pt"),
  Literal("10pt"),
  Literal("11pt"),
  Literal("12pt"),
  Literal("13pt"),
  Literal("14pt"),
  Literal("16pt"),
  Literal("18pt"),
  Literal("20pt")
);

const FontWeightSchema = Union(Literal("400"), Literal("700"));

const PaperMarginSchema = Union(Literal("normal"), Literal("narrow"));

const FontStyleSchema = Object({
  fontSize: FontSizeSchema,

  fontWeight: FontWeightSchema,

  color: String,
});

/** All the available fonts */
const AvailableFontsSchema = Union(
  Literal("headingLg"),
  Literal("headingMd"),
  Literal("headingSm"),
  Literal("bodyLg"),
  Literal("bodyMd"),
  Literal("bodySm"),
  Literal("bulletText"),
  Literal("icon")
);

const TypographyVariantSchema = Object({
  headingLg: FontStyleSchema,
  headingMd: FontStyleSchema,
  headingSm: FontStyleSchema,
  bodyLg: FontStyleSchema,
  bodyMd: FontStyleSchema,
  bodySm: FontStyleSchema,
  bulletText: FontStyleSchema,
  icon: FontStyleSchema,
});

export const StyleSchema = Object({
  /** Whether to show full URL for contact or just the ID */
  shouldShowFullContactLinks: Boolean,

  /** Whether the right-to-work line (from the profile) is shown under the name */
  shouldShowRightToWork: Boolean.optional(),

  /** The rating icon */
  ratingIcon: Union(Literal("star"), Literal("circle")),

  /** The bullet point icon */
  bulletPointIcon: Union(
    Literal("disc"),
    Literal("circle"),
    Literal("dash"),
    Literal("square")
  ),

  /** The date format */
  dateFormat: Union(
    Literal("MMM YYYY"),
    Literal("DD/MM/YYYY"),
    Literal("MMM/YYYY"),
    Literal("MMMM/YYYY"),
    Literal("YYYY.MM.DD")
  ),

  /** Displays different font names and sizes */
  typography: TypographyVariantSchema,

  /** The margin inside the paper. It related to narrow and normal margin of Microsoft words */
  paperMargin: PaperMarginSchema,
});

export type FontSize = Static<typeof FontSizeSchema>;
export type FontWeight = Static<typeof FontWeightSchema>;
export type AvailableFonts = Static<typeof AvailableFontsSchema>;
export type FontStyle = Static<typeof FontStyleSchema>;
export type Style = Static<typeof StyleSchema>;
export type Side = Static<typeof SideSchema>;
