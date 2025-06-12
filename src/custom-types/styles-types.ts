import { Object, String, Static, Union, Literal, Boolean } from "runtypes";

export const FontSizeSchema = Union(
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

export const FontWeightSchema = Union(Literal("400"), Literal("700"));

export const PaperMarginSchema = Union(Literal("normal"), Literal("narrow"));

export const FontStyleSchema = Object({
  fontSize: FontSizeSchema,

  fontWeight: FontWeightSchema,

  color: String,
});

/** All the available fonts */
export const AvailableFontsSchema = Union(
  Literal("headingLg"),
  Literal("headingMd"),
  Literal("headingSm"),
  Literal("bodyLg"),
  Literal("bodyMd"),
  Literal("bodySm"),
  Literal("bulletText"),
  Literal("icon")
);

export const TypographyVariantSchema = Object({
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

  /** The rating icon */
  ratingIcon: Union(Literal("star"), Literal("circle")),

  /** The date format */
  dateFormat: Union(
    Literal("DD/MM/YYYY"),
    Literal("MMM/YYYY"),
    Literal("MMMM/YYYY")
  ),

  typography: TypographyVariantSchema,

  paperMargin: PaperMarginSchema,
});

export type FontSize = Static<typeof FontSizeSchema>;
export type FontWeight = Static<typeof FontWeightSchema>;
export type AvailableFonts = Static<typeof AvailableFontsSchema>;
export type FontStyle = Static<typeof FontStyleSchema>;
export type PaperMargin = Static<typeof PaperMarginSchema>;
export type Style = Static<typeof StyleSchema>;
