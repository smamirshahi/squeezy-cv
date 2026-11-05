import { Side } from "@custom-types/styles-types";

/**
 * Id of a part of the CV in the preview: "personalInfo", "contactInfo", or the id of a
 * vault section.
 */
export type PreviewSectionId = string;

/** Id of a page in the editor: a fixed page ("metaData", ...) or the id of a vault section */
export type EditorSectionId = string;

export type PageStructure = Record<Side, PreviewSectionId[]>;
