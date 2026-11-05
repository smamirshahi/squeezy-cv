import { SectionPlacement } from "@pages/editor-page/section-placement/section-placement";
import { PageStructureSlider } from "@pages/editor-page/sections/editor-page-structure/page-structure-slider";

/** Shows the page format in editor page */
export function EditorPageStructure(): JSX.Element {
  return (
    <>
      <SectionPlacement />
      <PageStructureSlider />
    </>
  );
}
