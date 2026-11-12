import { Fragment } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddOutlined from "@mui/icons-material/AddOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import RemoveOutlined from "@mui/icons-material/RemoveOutlined";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { STYLE_TOKENS } from "@pages/editor-page/sections/editor-style-settings/style-tokens";
import { useResolvedStyle } from "@hooks/use-resolved-style";
import { setTypography, styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { FontWeight } from "@custom-types/styles-types";
import { stepFontSize } from "@shared/style/typography-utils";

const COLUMNS = "190px minmax(260px, 1fr) 120px 180px";
/** Width below which the rows scroll sideways */
const TABLE_MIN_WIDTH = 760;

/** The 5 text styles in one table: size and weight apply at once (colours are in the Colours card) */
export function TypographyTable(): JSX.Element {
  const dispatch = useAppDispatch();
  const { typography } = useAppSelector(styleSelector);
  const resolved = useResolvedStyle().typography;

  return (
    <Box
      component="section"
      aria-label="Typography"
      sx={{
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: 1.5,
        bgcolor: WORKSPACE_COLORS.panel,
        overflow: "auto",
      }}
    >
      <Box sx={{ p: { xs: 1.75, md: 2.5 }, pb: 1.75 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
          3 · Typography
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
          Set size and weight for each style. Changes apply at once.
        </Typography>
      </Box>
      <Box
        role="row"
        sx={{
          display: "grid",
          gridTemplateColumns: COLUMNS,
          gap: 1.25,
          px: 2.5,
          py: 0.75,
          minWidth: TABLE_MIN_WIDTH,
          bgcolor: WORKSPACE_COLORS.panelAlt,
          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".07em",
          textTransform: "uppercase",
          color: WORKSPACE_COLORS.muted,
        }}
      >
        <span>Style</span>
        <span>Sample</span>
        <span>Size</span>
        <span>Weight</span>
      </Box>
      {STYLE_TOKENS.map(({ variant, name, use, where, sample }) => {
        const style = typography[variant];
        return (
          <Fragment key={variant}>
            <Box
              role="row"
              data-style-row={variant}
              sx={{
                display: "grid",
                gridTemplateColumns: COLUMNS,
                gap: 1.25,
                alignItems: "center",
                px: 2.5,
                py: 1,
                minWidth: TABLE_MIN_WIDTH,
                borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
              }}
            >
              <Box>
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
                  {use}
                </Typography>
              </Box>
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
                  sx={{ minWidth: 36, textAlign: "center", fontWeight: 600 }}
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
          </Fragment>
        );
      })}
    </Box>
  );
}
