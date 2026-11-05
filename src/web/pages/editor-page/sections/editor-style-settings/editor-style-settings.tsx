import { DropdownDateType } from "@pages/editor-page/sections/editor-style-settings/dropdown-date-type";
import { FontCards } from "@pages/editor-page/sections/editor-style-settings/font-cards";
import { DropdownSkillIcon } from "@pages/editor-page/sections/editor-style-settings/dropdown-skill-icon";
import { DropdownMargin } from "@pages/editor-page/sections/editor-style-settings/dropdown-margin";
import { DropdownBulletPointIcon } from "@pages/editor-page/sections/editor-style-settings/dropdown-bullet-point-icon";
import { Grid } from "@mui/material";

/** Shows the typography section in editor page */
export function EditorTypography(): JSX.Element {
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
      <FontCards />
    </Grid>
  );
}
