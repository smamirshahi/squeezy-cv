import { useState } from "react";
import { Box, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { DropdownDateType } from "@pages/editor-page/sections/editor-style-settings/dropdown-date-type";
import { DropdownSkillIcon } from "@pages/editor-page/sections/editor-style-settings/dropdown-skill-icon";
import { DropdownMargin } from "@pages/editor-page/sections/editor-style-settings/dropdown-margin";
import { DropdownBulletPointIcon } from "@pages/editor-page/sections/editor-style-settings/dropdown-bullet-point-icon";
import { TypographyTable } from "@pages/editor-page/sections/editor-style-settings/typography-table";
import { StylePreview } from "@pages/editor-page/sections/editor-style-settings/style-preview";
import { TemplateScopeNote } from "@pages/workspace/template-scope";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  setShouldShowRightToWork,
  styleSelector,
} from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/** The Style settings page (design B14): page options, the typography table and a live preview */
export function EditorTypography(): JSX.Element {
  const dispatch = useAppDispatch();
  const { shouldShowRightToWork } = useAppSelector(styleSelector);
  const [isShowingNames, setIsShowingNames] = useState<boolean>(true);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
          Style settings
        </Typography>
        <Typography sx={{ color: WORKSPACE_COLORS.muted }}>
          The preview below updates as you change things.
        </Typography>
        <Box sx={{ mt: 1 }}>
          <TemplateScopeNote />
        </Box>
      </Box>
      <Box
        component="section"
        aria-label="Page"
        sx={{
          border: `1px solid ${WORKSPACE_COLORS.border}`,
          borderRadius: 1,
          bgcolor: WORKSPACE_COLORS.panel,
          p: 1.75,
        }}
      >
        <Typography
          sx={{
            mb: 1.25,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".07em",
            textTransform: "uppercase",
            color: WORKSPACE_COLORS.muted,
          }}
        >
          Page
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 1.5,
          }}
        >
          <DropdownMargin />
          <DropdownDateType />
          <DropdownSkillIcon />
          <DropdownBulletPointIcon />
        </Box>
        <FormControlLabel
          sx={{ mt: 1 }}
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
      </Box>
      <TypographyTable />
      <StylePreview
        isShowingNames={isShowingNames}
        onShowingNamesChange={setIsShowingNames}
      />
    </Box>
  );
}
