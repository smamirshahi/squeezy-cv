import { DateTypeDropdown } from "@pages/editor-page/sections/editor-typography/date-type-dropdown";
import { FontCards } from "@pages/editor-page/sections/editor-typography/font-cards";

/** Shows the typography section in editor page */
export function EditorTypography(): JSX.Element {
  return (
    <>
      <DateTypeDropdown />
      <FontCards />
    </>
  );
}
