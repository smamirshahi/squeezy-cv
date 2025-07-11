import { FontCards } from "@pages/editor-page/styles-editor-page/font-cards";
import { DateTypeDropdown } from "@pages/editor-page/styles-editor-page/date-type-dropdown";

/** Shows the styles section in editor page */
export function EditorStyles(): JSX.Element {
  return (
    <>
      <DateTypeDropdown />
      <FontCards />
    </>
  );
}
