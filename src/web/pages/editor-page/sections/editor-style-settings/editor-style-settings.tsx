import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Tooltip,
  Typography,
} from "@components/ui";
import { InfoOutlined } from "@components/ui/icons";
import { DropdownDateType } from "@pages/editor-page/sections/editor-style-settings/dropdown-date-type";
import { DropdownMargin } from "@pages/editor-page/sections/editor-style-settings/dropdown-margin";
import { DropdownBulletPointIcon } from "@pages/editor-page/sections/editor-style-settings/dropdown-bullet-point-icon";
import { GAP_PX } from "@custom-styles/custom-styles";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  resetTypography,
  setHasHeadingLine,
  setShouldShowIcons,
  setSectionSpacing,
  styleSelector,
} from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/** Allowed space between sections in px */
const SECTION_SPACING_RANGE = { min: 0, max: 40 } as const;

/** The reset button of the Design page: colours and text styles back to their defaults */
export function ResetStyleButton(): JSX.Element {
  const dispatch = useAppDispatch();
  return (
    <Tooltip title="Puts the colours, text sizes and weights back to their defaults. The other options (margin, dates, spacing, icons) stay as they are.">
      <Button
        size="small"
        variant="outlined"
        onClick={() => dispatch(resetTypography())}
      >
        Reset colours and text styles
      </Button>
    </Tooltip>
  );
}

/** The page options of a template: margin, dates, spacing, icons and bullets, one per row */
export function PageSettings(): JSX.Element {
  const dispatch = useAppDispatch();
  const { sectionSpacing, hasHeadingLine, shouldShowIcons } =
    useAppSelector(styleSelector);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
        What is the same everywhere. Settings of one section (the header,
        publications, skills ...) are in Sections.
      </Typography>
      <DropdownMargin />
      <DropdownDateType />
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
      <FormControlLabel
        sx={{ display: "flex", m: 0 }}
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
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <FormControlLabel
          sx={{ mr: 0.5, ml: 0 }}
          label="Icons next to details"
          control={
            <Checkbox
              checked={shouldShowIcons !== false}
              onChange={(event) =>
                dispatch(setShouldShowIcons(event.target.checked))
              }
            />
          }
        />
        <Tooltip title="Shows a small icon before each detail so it is easy to tell what it is: a link icon for links, a calendar for dates, a pin for locations, and the same for email and phone. Untick for a plainer look.">
          <InfoOutlined
            tabIndex={0}
            aria-label="About icons next to details"
            sx={{ fontSize: 16, color: WORKSPACE_COLORS.muted }}
          />
        </Tooltip>
      </Box>
    </Box>
  );
}
