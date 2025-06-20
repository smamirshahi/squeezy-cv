export type Side = "fullWidth" | "left" | "right";

export type SectionId =
  | "personalInfo"
  | "contactInfo"
  | "summary"
  | "experiences"
  | "educations"
  | "skills";

export interface SectionProps {
  /** The unique ID of the section */
  id: SectionId;

  /** The content of the section */
  content: React.ReactElement | null;

  /** The x and y position */
  position: { x: number; y: number };

  /** The side where the section is displayed */
  layout: Side;
}

/** Maps Side to sectionId */
export type SideToSectionIdMap = Record<Side, SectionId[]>;

/** Maps sectionId to its content */
export type SectionIdToContentMap = Record<
  SectionId,
  React.ReactElement | null
>;
