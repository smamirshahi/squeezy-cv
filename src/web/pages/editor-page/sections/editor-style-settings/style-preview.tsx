import { useCallback, useRef, useState } from "react";
import { Box, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { GAP_PX } from "@custom-styles/custom-styles";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { ZoomFrame } from "@pages/workspace/canvas-zoom";
import { useStyleHover } from "@pages/editor-page/sections/editor-style-settings/style-hover";
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

const PAPER_WIDTH_PX = 620;
const DIMMED = 0.22;

/**
 * Right panel of the Style settings page: a small sheet with demo text drawn with the current
 * styles. When the pointer is on a style in the table, only that style stays clear.
 */
export function StylePreviewPanel(): JSX.Element {
  const {
    typography,
    bulletPointIcon,
    ratingIcon,
    sectionSpacing,
    hasHeadingLine,
  } = useAppSelector(styleSelector);
  const { hovered } = useStyleHover();
  const [isShowingNames, setIsShowingNames] = useState<boolean>(true);
  const [available, setAvailable] = useState<number>(0);
  const observer = useRef<ResizeObserver | null>(null);

  const measure = useCallback((node: HTMLDivElement | null): void => {
    observer.current?.disconnect();
    observer.current = null;
    if (node === null || typeof ResizeObserver === "undefined") {
      return;
    }
    setAvailable(node.clientWidth);
    observer.current = new ResizeObserver(() => setAvailable(node.clientWidth));
    observer.current.observe(node);
  }, []);

  const zoom = available > 0 ? Math.min(1, available / PAPER_WIDTH_PX) : 0.5;

  return (
    <ResizableAside side="right" label="the live preview" defaultWidth={420}>
      <Box
        component="aside"
        aria-label="Live preview"
        sx={{
          width: "100%",
          flex: "none",
          bgcolor: WORKSPACE_COLORS.panel,
          borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
          p: 2,
          overflow: "auto",
        }}
      >
        <Typography sx={{ fontWeight: 700 }}>Live preview</Typography>
        <Typography
          variant="body2"
          sx={{ color: WORKSPACE_COLORS.muted, mb: 0.5 }}
        >
          Demo text, not your data. Point at a style to see where it is used.
        </Typography>
        <FormControlLabel
          label="Show style names"
          control={
            <Checkbox
              size="small"
              checked={isShowingNames}
              onChange={(event) => setIsShowingNames(event.target.checked)}
            />
          }
        />
        <Box ref={measure} sx={{ width: "100%" }}>
          <ZoomFrame zoom={zoom}>
            <Box
              data-testid="style-preview-paper"
              sx={{
                width: PAPER_WIDTH_PX,
                bgcolor: "#fff",
                color: "#000",
                border: `1px solid ${WORKSPACE_COLORS.border}`,
                pl: "84px",
                pr: "38px",
                pt: "30px",
                pb: "34px",
                fontFamily: "Calibri, sans-serif",
                boxSizing: "border-box",
              }}
            >
              {DEMO_LINES.map((line, index) => {
                const style = typography[line.variant];
                const symbol = symbolFor(
                  line.icon,
                  bulletPointIcon,
                  ratingIcon
                );
                const isIconFocus = hovered === "icon";
                // With an icon style picked, the symbols stay clear and their text fades
                const isLineDimmed =
                  hovered !== null &&
                  (isIconFocus ? symbol === "" : hovered !== line.variant);
                const isTextDimmed =
                  isIconFocus && symbol !== "" && hovered !== line.variant;
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
                      opacity: isLineDimmed ? DIMMED : 1,
                      transition: "opacity .12s",
                      ...(line.isHeadingRule && {
                        borderBottom:
                          hasHeadingLine === false ? "none" : "1px solid #000",
                        pb: "2px",
                        mt: `${sectionSpacing ?? GAP_PX.sectionTop}px`,
                      }),
                    }}
                  >
                    {isShowingNames && (
                      // zero-width, on the text baseline, hanging into the left margin
                      <Box
                        component="span"
                        aria-hidden="true"
                        sx={{
                          display: "inline-block",
                          width: 0,
                          verticalAlign: "baseline",
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "inline-block",
                            transform: "translateX(-100%)",
                            ml: "-8px",
                            font: "600 9px/1 sans-serif",
                            color: WORKSPACE_COLORS.accent,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {line.variant}
                        </Box>
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
                    <Box
                      component="span"
                      sx={{
                        opacity: isTextDimmed ? DIMMED : 1,
                        transition: "opacity .12s",
                      }}
                    >
                      {line.text}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </ZoomFrame>
        </Box>
      </Box>
    </ResizableAside>
  );
}
