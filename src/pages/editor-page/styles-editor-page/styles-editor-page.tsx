import { CVAccordion } from "@components/cv-accordion";
import { setPaperMargin, styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
} from "@mui/material";
import { Style } from "@custom-types/styles-types";
import {
  appSelector,
  setShouldShowBorders,
  setShouldShowGrids,
} from "@store/app/app-slice";
import { FontCards } from "@pages/editor-page/styles-editor-page/font-cards";
import { DateTypeDropdown } from "@pages/editor-page/styles-editor-page/date-type-dropdown";

/** Shows the styles section in editor page */
export function StylesEditorPage(): JSX.Element {
  const { paperMargin } = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();
  const app = useAppSelector(appSelector);

  return (
    <CVAccordion title="Styles">
      <FormControl component="fieldset" variant="standard">
        <Box component="div" display="flex" flexDirection="row">
          <FormControlLabel
            control={
              <Switch
                checked={app.shouldShowGrids}
                onChange={(event) =>
                  dispatch(setShouldShowGrids(event.target.checked))
                }
              />
            }
            label="Should show Grids"
          />
          <FormControlLabel
            control={
              <Switch
                checked={app.shouldShowBorders}
                onChange={(event) =>
                  dispatch(setShouldShowBorders(event.target.checked))
                }
              />
            }
            label="Should show borders"
          />
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
      <DateTypeDropdown />
      <FontCards />
    </CVAccordion>
  );
}
