import { EditorSectionId } from "@store/app/app-slice-types";

export type EditorPageSection = {
  [key in EditorSectionId]: {
    id: key;
    label: string;
    content: JSX.Element;
    additionalButton?: {
      label: string;
      onClick: () => void;
    };
  };
};
