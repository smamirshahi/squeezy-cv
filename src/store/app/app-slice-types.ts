import { Side } from "@custom-types/styles-types";

/** Sections in preview page */
export type PreviewSectionId =
  | "personalInfo"
  | "contactInfo"
  | "summary"
  | "experiences"
  | "educations"
  | "skills";

/** Sections in editor page */
export type EditorSectionId =
  | "metaData"
  | "styleSettings"
  | "pageStructure"
  | "mainInfo"
  | "summary"
  | "experiences"
  | "educations"
  | "skills";

export type PageStructure = Record<Side, PreviewSectionId[]>;
