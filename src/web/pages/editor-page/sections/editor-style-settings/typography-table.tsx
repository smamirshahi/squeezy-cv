import { useState } from "react";
import {
  Box,
  Collapse,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@components/ui";
import {
  AddOutlined,
  ExpandMoreOutlined,
  InfoOutlined,
  RemoveOutlined,
} from "@components/ui/icons";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { STYLE_TOKENS } from "@pages/editor-page/sections/editor-style-settings/style-tokens";
import { useResolvedStyle } from "@hooks/use-resolved-style";
import { setTypography, styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { FontWeight } from "@custom-types/styles-types";
import { stepFontSize } from "@shared/style/typography-utils";

/** The 5 text styles, one open at a time: size and weight apply at once (colours are in Colours) */
export function TypographyTable(): JSX.Element {
  const dispatch = useAppDispatch();
  const { typography } = useAppSelector(styleSelector);
  const resolved = useResolvedStyle().typography;
  const [openVariant, setOpenVariant] = useState<string>(
    STYLE_TOKENS[0].variant
  );

  return (
    <Box
      component="section"
      aria-label="Typography"
      sx={{
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: 1.5,
        bgcolor: WORKSPACE_COLORS.panel,
        overflow: "hidden",
      }}
    >
      {STYLE_TOKENS.map(({ variant, name, use, where, sample }, position) => {
        const style = typography[variant];
        const isOpen = openVariant === variant;
        return (
          <Box
            key={variant}
            data-style-row={variant}
            sx={{
              borderTop:
                position === 0 ? 0 : `1px solid ${WORKSPACE_COLORS.border}`,
            }}
          >
            <Box
              component="button"
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenVariant(isOpen ? "" : variant)}
              sx={{
                all: "unset",
                boxSizing: "border-box",
                width: "100%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 1.25,
                minHeight: 44,
                "&:focus-visible": {
                  outline: `2px solid ${WORKSPACE_COLORS.accent}`,
                  outlineOffset: -2,
                },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                    {name}
                  </Typography>
                  <Tooltip title={`Used for: ${where}`} placement="right">
                    <InfoOutlined
                      tabIndex={0}
                      aria-label={`Where ${variant} is used`}
                      sx={{ fontSize: 15, color: WORKSPACE_COLORS.muted }}
                    />
                  </Tooltip>
                </Box>
                <Typography
                  sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}
                >
                  {use} · {style.fontSize}pt{" "}
                  {style.fontWeight === "700" ? "bold" : "regular"}
                </Typography>
              </Box>
              <ExpandMoreOutlined
                fontSize="small"
                sx={{
                  color: WORKSPACE_COLORS.muted,
                  transform: isOpen ? "rotate(180deg)" : "none",
                }}
              />
            </Box>
            <Collapse in={isOpen} unmountOnExit>
              <Box
                sx={{
                  px: 1.5,
                  pb: 1.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.25,
                }}
              >
                <Box
                  data-testid={`sample-${variant}`}
                  sx={{
                    bgcolor: "#fff",
                    border: `1px solid ${WORKSPACE_COLORS.border}`,
                    borderRadius: 0.5,
                    px: 1.25,
                    py: 0.5,
                    minHeight: 34,
                    display: "flex",
                    alignItems: "center",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    fontFamily: "Calibri, sans-serif",
                    fontSize: style.fontSize,
                    fontWeight: style.fontWeight,
                    color: resolved[variant].color,
                  }}
                >
                  {sample}
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <IconButton
                      size="small"
                      aria-label={`Decrease ${variant} size`}
                      onClick={() =>
                        dispatch(
                          setTypography({
                            variant,
                            fontStyle: {
                              ...style,
                              fontSize: stepFontSize(style.fontSize, -1),
                            },
                          })
                        )
                      }
                    >
                      <RemoveOutlined fontSize="small" />
                    </IconButton>
                    <Typography
                      aria-label={`${variant} size`}
                      sx={{
                        minWidth: 36,
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      {style.fontSize}
                    </Typography>
                    <IconButton
                      size="small"
                      aria-label={`Increase ${variant} size`}
                      onClick={() =>
                        dispatch(
                          setTypography({
                            variant,
                            fontStyle: {
                              ...style,
                              fontSize: stepFontSize(style.fontSize, 1),
                            },
                          })
                        )
                      }
                    >
                      <AddOutlined fontSize="small" />
                    </IconButton>
                  </Box>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    aria-label={`${variant} weight`}
                    value={style.fontWeight}
                    onChange={(_event, weight: FontWeight | null) => {
                      if (weight !== null) {
                        dispatch(
                          setTypography({
                            variant,
                            fontStyle: { ...style, fontWeight: weight },
                          })
                        );
                      }
                    }}
                  >
                    <ToggleButton value="400" sx={{ textTransform: "none" }}>
                      Regular
                    </ToggleButton>
                    <ToggleButton value="700" sx={{ textTransform: "none" }}>
                      Bold
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Box>
  );
}
