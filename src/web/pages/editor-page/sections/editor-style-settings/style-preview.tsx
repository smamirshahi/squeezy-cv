import { Box, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { AvailableFonts, Style } from "@custom-types/styles-types";

interface DemoLine {
  variant: AvailableFonts;
  text: string;
  /** Show the bullet or skill symbol before the text */
  icon?: "bullet" | "skill";
  isHeadingRule?: boolean;
  gapAfter?: number;
}

/** Made-up text, never the user's data */
const DEMO_LINES: readonly DemoLine[] = [
  { variant: "headingLg", text: "Alex Morgan" },
  { variant: "bodyLg", text: "Frontend engineer, React and TypeScript" },
  {
    variant: "bodySm",
    text: "alex@example.com · 07000 000000 · Nottingham, UK",
    gapAfter: 10,
  },
  { variant: "headingMd", text: "Professional Summary", isHeadingRule: true },
  {
    variant: "bodyMd",
    text: "Builds accessible, well tested interfaces for finance teams. Comfortable owning a feature from design to release.",
    gapAfter: 10,
  },
  { variant: "headingMd", text: "Work Experience", isHeadingRule: true },
  { variant: "headingSm", text: "Senior Software Developer, Northfield Labs" },
  { variant: "bodySm", text: "Dec 2018 to Present · Nottingham, UK" },
  {
    variant: "bulletText",
    text: "Cut page load time by 38% with code splitting",
    icon: "bullet",
  },
  {
    variant: "bulletText",
    text: "Led migration of 40 screens to TypeScript",
    icon: "bullet",
    gapAfter: 10,
  },
  { variant: "headingMd", text: "Skills", isHeadingRule: true },
  {
    variant: "bodyMd",
    text: "React, TypeScript, Redux Toolkit, Testing, Accessibility",
    icon: "skill",
  },
];

const BULLET_SYMBOLS: Record<Style["bulletPointIcon"], string> = {
  disc: "●",
  circle: "○",
  dash: "–",
  square: "■",
};

/** The symbol drawn before a bullet or skill line */
function symbolFor(
  icon: DemoLine["icon"],
  bulletPointIcon: Style["bulletPointIcon"],
  ratingIcon: Style["ratingIcon"]
): string {
  if (icon === "bullet") {
    return BULLET_SYMBOLS[bulletPointIcon];
  }
  if (icon === "skill") {
    return ratingIcon === "star" ? "★" : "●";
  }
  return "";
}

interface Props {
  isShowingNames: boolean;
  onShowingNamesChange: (isShowing: boolean) => void;
}

/** A small sheet with demo text drawn with the current styles; updates as they change */
export function StylePreview({
  isShowingNames,
  onShowingNamesChange,
}: Props): JSX.Element {
  const { typography, bulletPointIcon, ratingIcon } =
    useAppSelector(styleSelector);

  return (
    <Box component="section" aria-label="Live preview">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1 }}>
        <Typography sx={{ fontWeight: 700 }}>Live preview</Typography>
        <Typography
          variant="body2"
          sx={{ flex: 1, color: WORKSPACE_COLORS.muted }}
        >
          Demo text, not your data
        </Typography>
        <FormControlLabel
          label="Show style names"
          control={
            <Checkbox
              size="small"
              checked={isShowingNames}
              onChange={(event) => onShowingNamesChange(event.target.checked)}
            />
          }
        />
      </Box>
      <Box
        sx={{
          bgcolor: WORKSPACE_COLORS.canvas,
          border: `1px solid ${WORKSPACE_COLORS.border}`,
          borderRadius: 0.5,
          p: 2.5,
          display: "flex",
          justifyContent: "center",
          overflow: "auto",
        }}
      >
        <Box
          data-testid="style-preview-paper"
          sx={{
            width: 620,
            flex: "none",
            bgcolor: "#fff",
            color: "#000",
            px: "38px",
            pt: "30px",
            pb: "34px",
            boxShadow: "0 1px 8px rgba(0,0,0,.18)",
            fontFamily: "Calibri, sans-serif",
          }}
        >
          {DEMO_LINES.map((line, index) => {
            const style = typography[line.variant];
            const symbol = symbolFor(line.icon, bulletPointIcon, ratingIcon);
            return (
              <Box
                key={index}
                data-style-line={line.variant}
                sx={{
                  position: "relative",
                  fontSize: style.fontSize,
                  fontWeight: style.fontWeight,
                  color: style.color,
                  lineHeight: 1.35,
                  mb: `${line.gapAfter ?? 2}px`,
                  ...(line.isHeadingRule && {
                    borderBottom: "1px solid #000",
                    pb: "2px",
                  }),
                }}
              >
                {isShowingNames && (
                  <Box
                    component="span"
                    aria-hidden="true"
                    sx={{
                      position: "absolute",
                      right: "100%",
                      mr: "8px",
                      top: 2,
                      font: "600 9px/1 sans-serif",
                      color: WORKSPACE_COLORS.accent,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {line.variant}
                  </Box>
                )}
                {symbol !== "" && (
                  <Box
                    component="span"
                    aria-hidden="true"
                    sx={{
                      mr: "6px",
                      color: typography.icon.color,
                      fontSize: typography.icon.fontSize,
                      fontWeight: typography.icon.fontWeight,
                    }}
                  >
                    {symbol}
                  </Box>
                )}
                {line.text}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
