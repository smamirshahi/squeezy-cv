import {
  Box,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material";
import { DropdownDateType } from "@pages/editor-page/sections/editor-style-settings/dropdown-date-type";
import { DropdownSkillIcon } from "@pages/editor-page/sections/editor-style-settings/dropdown-skill-icon";
import { DropdownMargin } from "@pages/editor-page/sections/editor-style-settings/dropdown-margin";
import { DropdownBulletPointIcon } from "@pages/editor-page/sections/editor-style-settings/dropdown-bullet-point-icon";
import { TypographyTable } from "@pages/editor-page/sections/editor-style-settings/typography-table";
import { GAP_PX } from "@custom-styles/custom-styles";
import { TemplateScopeNote } from "@pages/workspace/template-scope";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  setHasHeadingLine,
  setSectionSpacing,
  setShouldShowRightToWork,
  setShouldShowLinks,
  styleSelector,
} from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/** Allowed space between sections in px */
const SECTION_SPACING_RANGE = { min: 0, max: 40 } as const;

/** The Style settings page (design B14): page options and the typography table (the live preview is the right panel) */
export function EditorTypography(): JSX.Element {
  const dispatch = useAppDispatch();
  const {
    shouldShowRightToWork,
    shouldShowLinks,
    sectionSpacing,
    hasHeadingLine,
  } = useAppSelector(styleSelector);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
          Style settings
        </Typography>
        <Typography sx={{ color: WORKSPACE_COLORS.muted }}>
          The preview on the right updates as you change things.
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
          <TextField
            type="number"
            label="Space between sections (px)"
            value={sectionSpacing ?? GAP_PX.sectionTop}
            slotProps={{
              htmlInput: {
                min: SECTION_SPACING_RANGE.min,
                max: SECTION_SPACING_RANGE.max,
              },
            }}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (event.target.value !== "" && Number.isFinite(value)) {
                dispatch(
                  setSectionSpacing(
                    Math.min(
                      SECTION_SPACING_RANGE.max,
                      Math.max(SECTION_SPACING_RANGE.min, value)
                    )
                  )
                );
              }
            }}
          />
        </Box>
        <FormControlLabel
          sx={{ mt: 1, display: "flex" }}
          label="Line under section titles"
          control={
            <Checkbox
              checked={hasHeadingLine !== false}
              onChange={(event) =>
                dispatch(setHasHeadingLine(event.target.checked))
              }
            />
          }
        />
        <FormControlLabel
          sx={{ mt: 1, display: "flex" }}
          label="Show my links (LinkedIn, GitHub, ...) in the contact details"
          control={
            <Checkbox
              checked={shouldShowLinks !== false}
              onChange={(event) =>
                dispatch(setShouldShowLinks(event.target.checked))
              }
            />
          }
        />
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
    </Box>
  );
}
