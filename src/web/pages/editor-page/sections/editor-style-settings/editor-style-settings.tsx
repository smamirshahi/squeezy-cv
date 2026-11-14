import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Tooltip,
  Typography,
} from "@components/ui";
import { DropdownCitationStyle } from "@pages/editor-page/sections/editor-style-settings/dropdown-citation-style";
import { InfoOutlined } from "@components/ui/icons";
import { DropdownDateType } from "@pages/editor-page/sections/editor-style-settings/dropdown-date-type";
import { DropdownSkillIcon } from "@pages/editor-page/sections/editor-style-settings/dropdown-skill-icon";
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
  setShouldShowRightToWork,
  setShouldShowPhoto,
  setShouldShowLinks,
  setShouldShowNationality,
  setShouldShowMaritalStatus,
  setShouldShowGender,
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
    shouldShowPhoto,
    shouldShowLinks,
    shouldShowNationality,
    shouldShowMaritalStatus,
    shouldShowGender,
    sectionSpacing,
    hasHeadingLine,
    shouldShowIcons,
  } = useAppSelector(styleSelector);

  /** The details that can be switched on in the header, one checkbox each */
  const headerOptions: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    info?: string;
  }[] = [
    {
      label: "Links (LinkedIn, GitHub, ...)",
      checked: shouldShowLinks !== false,
      onChange: (value) => dispatch(setShouldShowLinks(value)),
      info: "This turns links on or off for the whole template. Which links appear, and in what order, is chosen separately for each job, on the job's Content tab.",
    },
    {
      label: "Profile photo",
      checked: shouldShowPhoto !== false,
      onChange: (value) => dispatch(setShouldShowPhoto(value)),
      info: "Only has an effect when a photo is added in Main Info.",
    },
    {
      label: "Nationality",
      checked: shouldShowNationality ?? false,
      onChange: (value) => dispatch(setShouldShowNationality(value)),
    },
    {
      label: "Marital status",
      checked: shouldShowMaritalStatus ?? false,
      onChange: (value) => dispatch(setShouldShowMaritalStatus(value)),
    },
    {
      label: "Gender",
      checked: shouldShowGender ?? false,
      onChange: (value) => dispatch(setShouldShowGender(value)),
    },
    {
      label: "Right to work",
      checked: shouldShowRightToWork ?? false,
      onChange: (value) => dispatch(setShouldShowRightToWork(value)),
    },
  ];

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
            Margins, dates, icons and which details show in the header.
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
          <DropdownSkillIcon />
          <DropdownBulletPointIcon />
          <DropdownCitationStyle />
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
        <Box
          component="fieldset"
          sx={{ border: 0, p: 0, m: 0, mt: 1.5, minWidth: 0 }}
        >
          <Typography
            component="legend"
            sx={{
              mb: 0.5,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".07em",
              textTransform: "uppercase",
              color: WORKSPACE_COLORS.muted,
            }}
          >
            Show in the header
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
              },
              columnGap: 1.5,
            }}
          >
            {headerOptions.map(({ label, checked, onChange, info }) => (
              <Box
                key={label}
                sx={{ display: "flex", alignItems: "center", minWidth: 0 }}
              >
                <FormControlLabel
                  sx={{ mr: 0.5 }}
                  label={label}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={(event) => onChange(event.target.checked)}
                    />
                  }
                />
                {info !== undefined && (
                  <Tooltip title={info}>
                    <InfoOutlined
                      tabIndex={0}
                      aria-label={`About ${label.toLowerCase()}`}
                      sx={{ fontSize: 16, color: WORKSPACE_COLORS.muted }}
                    />
                  </Tooltip>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      <ColoursCard />
      <TypographyTable />
    </Box>
  );
}
