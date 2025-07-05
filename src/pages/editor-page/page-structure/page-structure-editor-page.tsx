import { setPaperMargin, styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { Style } from "@custom-types/styles-types";
import { SectionPlacement } from "@pages/editor-page/section-placement/section-placement";
import { PageStructureSlider } from "@pages/editor-page/styles-editor-page/page-structure-slider";

/** Shows the page format in editor page */
export function PageFormatEditorPage(): JSX.Element {
  const { paperMargin } = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();

  return (
    <>
      <FormControl component="fieldset" variant="standard">
        <Box component="div" display="flex" flexDirection="row">
          <FormControl>
            <InputLabel id="date-format-label">Margin</InputLabel>
            <Select
              value={paperMargin}
              label="Margin"
              onChange={(event) =>
                dispatch(
                  setPaperMargin(event.target.value as Style["paperMargin"])
                )
              }
            >
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="narrow">Narrow</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </FormControl>
      <SectionPlacement />
      <PageStructureSlider />
    </>
  );
}
