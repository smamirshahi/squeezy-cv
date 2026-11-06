import { DropdownDateType } from "@pages/editor-page/sections/editor-style-settings/dropdown-date-type";
import { FontCards } from "@pages/editor-page/sections/editor-style-settings/font-cards";
import { DropdownSkillIcon } from "@pages/editor-page/sections/editor-style-settings/dropdown-skill-icon";
import { DropdownMargin } from "@pages/editor-page/sections/editor-style-settings/dropdown-margin";
import { DropdownBulletPointIcon } from "@pages/editor-page/sections/editor-style-settings/dropdown-bullet-point-icon";
import { Checkbox, FormControlLabel, Grid } from "@mui/material";
import {
  setShouldShowRightToWork,
  styleSelector,
} from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/** Shows the typography section in editor page */
export function EditorTypography(): JSX.Element {
  const dispatch = useAppDispatch();
  const { shouldShowRightToWork } = useAppSelector(styleSelector);

  return (
    <Grid container spacing={2}>
      <Grid size={6}>
        <DropdownMargin />
      </Grid>
      <Grid size={6}>
        <DropdownDateType />
      </Grid>
      <Grid size={6}>
        <DropdownSkillIcon />
      </Grid>
      <Grid size={6}>
        <DropdownBulletPointIcon />
      </Grid>
      <Grid size={12}>
        <FormControlLabel
          label="Show the right-to-work line under my name"
          control={
            <Checkbox
              checked={shouldShowRightToWork ?? false}
              onChange={(event) =>
                dispatch(setShouldShowRightToWork(event.target.checked))
              }
            />
          }
        />
      </Grid>
      <FontCards />
    </Grid>
  );
}
