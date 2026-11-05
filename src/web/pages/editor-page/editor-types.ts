import { EditorSectionId } from "@store/app/app-slice-types";

/** One page of the editor, shown in the side bar */
export interface EditorPageEntry {
  id: EditorSectionId;
  label: string;
  content: JSX.Element;
}

/** All pages of the editor, in side bar order */
export type EditorPageSection = EditorPageEntry[];
