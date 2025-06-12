import { Object, String, Static, Union, Literal, Boolean } from "runtypes";

export const FontStyleSchema = Object({
  fontSize: Union(
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
  ),

  fontWeight: Union(Literal("400"), Literal("700")),

  color: String,
});

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
});

export type Style = Static<typeof StyleSchema>;
