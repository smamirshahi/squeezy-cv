import { SectionPlacement } from "@pages/editor-page/section-placement/section-placement";
import { PageStructureSlider } from "@pages/editor-page/styles-editor-page/page-structure-slider";
import { MarginDropdown } from "@pages/editor-page/sections/page-structure/margin-dropdown";

/** Shows the page format in editor page */
export function EditorPageStructure(): JSX.Element {
  return (
    <>
      <MarginDropdown />
      <SectionPlacement />
      <PageStructureSlider />
    </>
  );
}
