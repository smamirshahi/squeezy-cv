import { Box, Button, Typography } from "@mui/material";
import { TemplateScopeNote } from "@pages/workspace/template-scope";
import { SectionPlacement } from "@pages/editor-page/section-placement/section-placement";
import { PageStructureSlider } from "@pages/editor-page/sections/editor-page-structure/page-structure-slider";
import { updatePageStructure } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { sectionsSelector } from "@store/vault/vault-slice";
import {
  singleColumnLayout,
  twoColumnLayout,
} from "@shared/vault/page-structure";

/** Shows the page format in editor page */
export function EditorPageStructure(): JSX.Element {
  const dispatch = useAppDispatch();
  const sections = useAppSelector(sectionsSelector);

  return (
    <>
      <Box sx={{ mb: 1 }}>
        <TemplateScopeNote />
      </Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Start from a layout, then drag parts to fine-tune. This belongs to the
        template of the job you are editing, so every job on it follows.
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          mb: 2,
        }}
      >
        <Button
          variant="outlined"
          onClick={() =>
            dispatch(updatePageStructure(singleColumnLayout(sections)))
          }
        >
          Single column (UK)
        </Button>
        <Button
          variant="outlined"
          onClick={() =>
            dispatch(updatePageStructure(twoColumnLayout(sections)))
          }
        >
          Two columns
        </Button>
      </Box>
      <SectionPlacement />
      <PageStructureSlider />
    </>
  );
}
