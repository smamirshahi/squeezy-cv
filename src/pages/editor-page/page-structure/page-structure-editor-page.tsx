import { Box, FormControl } from "@mui/material";
import { SectionPlacement } from "@pages/editor-page/section-placement/section-placement";
import { PageStructureSlider } from "@pages/editor-page/styles-editor-page/page-structure-slider";
import { MarginDropdown } from "@pages/editor-page/page-structure/margin-dropdown";

/** Shows the page format in editor page */
export function PageFormatEditorPage(): JSX.Element {
  return (
    <>
      <FormControl component="fieldset" variant="standard">
        <Box component="div" display="flex" flexDirection="row">
          <MarginDropdown />
        </Box>
      </FormControl>
      <SectionPlacement />
      <PageStructureSlider />
    </>
  );
}
