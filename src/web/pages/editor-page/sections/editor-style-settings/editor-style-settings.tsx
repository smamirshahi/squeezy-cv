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
import { ColoursCard } from "@pages/editor-page/sections/editor-style-settings/colours-card";
import { TypographyTable } from "@pages/editor-page/sections/editor-style-settings/typography-table";
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

/** The Style settings page (design B14): page options and the typography table (the live preview is the right panel) */
export function EditorTypography(): JSX.Element {
  const dispatch = useAppDispatch();
  const { sectionSpacing, hasHeadingLine, shouldShowIcons } =
    useAppSelector(styleSelector);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          flexWrap: { xs: "wrap", sm: "nowrap" },
          gap: 1.5,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700 }}>
            Style
          </Typography>
          <Typography sx={{ color: WORKSPACE_COLORS.muted }}>
            The preview on the right updates as you change things.
          </Typography>
        </Box>
        <Tooltip title="Puts the colours, text sizes and weights back to their defaults. The other options on this page stay as they are.">
          <Button
            size="small"
            variant="outlined"
            onClick={() => dispatch(resetTypography())}
          >
            Reset colours and text styles
          </Button>
        </Tooltip>
      </Box>
      <Box
        component="section"
        aria-label="Page"
        sx={{
          border: `1px solid ${WORKSPACE_COLORS.border}`,
          borderRadius: 1.5,
          bgcolor: WORKSPACE_COLORS.panel,
          p: { xs: 1.75, md: 2.5 },
        }}
      >
        <Box sx={{ mb: 1.75 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
            1 · Page
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
            What is the same everywhere: margin, dates, spacing, icons and
            bullets. Settings of one section (the header, publications, skills
            ...) are in Sections.
          </Typography>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            gap: 1.5,
          }}
        >
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
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <FormControlLabel
            sx={{ mr: 0.5 }}
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
      <ColoursCard />
      <TypographyTable />
    </Box>
  );
}
