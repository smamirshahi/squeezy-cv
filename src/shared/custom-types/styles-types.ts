import {
  Object,
  String,
  Static,
  Union,
  Literal,
  Boolean,
  Number,
} from "runtypes";

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

/** The few colours of a CV (#283): the rest of the page is drawn from these */
const ColorsSchema = Object({
  /** Name, headings, body text, bullets and skills */
  text: String,

  /** Dates, locations and the contact line */
  secondary: String,

  /** Section titles, the rule under them and the bullet and skill symbols; missing = same as text */
  accent: String.optional(),
});

export const StyleSchema = Object({
  /** Whether to show full URL for contact or just the ID */
  shouldShowFullContactLinks: Boolean,

  /** Whether the contact area draws the links (LinkedIn, GitHub, ...); missing = shown */
  shouldShowLinks: Boolean.optional(),

  /** Whether the nationalities (from the profile) are shown under the name; missing = hidden */
  shouldShowNationality: Boolean.optional(),

  /** Whether the marital status (from the profile) is shown under the name; missing = hidden */
  shouldShowMaritalStatus: Boolean.optional(),

  /** Whether the gender (from the profile) is shown under the name; missing = hidden */
  shouldShowGender: Boolean.optional(),

  /** Whether the profile photo is drawn in the header; missing = shown */
  shouldShowPhoto: Boolean.optional(),

  /** Whether each reference shows its email and phone (other people's details); missing = hidden */
  shouldShowReferenceContacts: Boolean.optional(),

  /** Whether the References section is only the line "References available on request" instead of the list; missing = the list */
  isReferencesOnRequest: Boolean.optional(),

  /** Whether the right-to-work line (from the profile) is shown under the name */
  shouldShowRightToWork: Boolean.optional(),

  /** Whether the small icons (link, date, location, email, phone ...) show before details; missing = shown */
  shouldShowIcons: Boolean.optional(),

  /** Space above each section title in px (0-40); missing = the default */
  sectionSpacing: Number.optional(),

  /** How a publication is written: apa (default), ieee or plain */
  citationStyle: Union(
    Literal("apa"),
    Literal("ieee"),
    Literal("plain")
  ).optional(),

  /** Whether a publication shows its link at the end of the line ("end", default) or no link at all */
  publicationLinks: Union(Literal("end"), Literal("none")).optional(),

  /** Whether the author that is the user is drawn bold; missing = bold */
  highlightOwnName: Boolean.optional(),

  /** How many authors a publication names before "et al."; missing = 6 */
  maxAuthors: Union(Literal(3), Literal(6), Literal("all")).optional(),

  /** Publications newest first (default) or in the order of the vault / the job */
  publicationOrder: Union(Literal("newest"), Literal("manual")).optional(),

  /** Work experience newest first (default) or oldest first */
  experienceOrder: Union(Literal("newest"), Literal("oldest")).optional(),

  /** Education newest first (default) or oldest first */
  educationOrder: Union(Literal("newest"), Literal("oldest")).optional(),

  /** The line under each section title; missing = shown */
  hasHeadingLine: Boolean.optional(),

  /** The rating icon */
  ratingIcon: Union(Literal("star"), Literal("circle"), Literal("text")),

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

  /**
   * The colours of the page. Missing (a file from before #283) = text from the `bodyMd` colour and
   * secondary from `bodySm`, no accent. The colours inside `typography` are no longer used.
   */
  colors: ColorsSchema.optional(),

  /** Displays different font names and sizes */
  typography: TypographyVariantSchema,

  /** The margin inside the paper. It related to narrow and normal margin of Microsoft words */
  paperMargin: PaperMarginSchema,
});

export type FontSize = Static<typeof FontSizeSchema>;
export type FontWeight = Static<typeof FontWeightSchema>;
export type AvailableFonts = Static<typeof AvailableFontsSchema>;
export type Colors = Static<typeof ColorsSchema>;
export type FontStyle = Static<typeof FontStyleSchema>;
export type Style = Static<typeof StyleSchema>;
export type Side = Static<typeof SideSchema>;
