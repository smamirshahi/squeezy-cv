import { Fragment, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  TextField,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddOutlined from "@mui/icons-material/AddOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import RemoveOutlined from "@mui/icons-material/RemoveOutlined";
import { useStyleHover } from "@pages/editor-page/sections/editor-style-settings/style-hover";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  COLOR_PRESETS,
  STYLE_TOKENS,
} from "@pages/editor-page/sections/editor-style-settings/style-tokens";
import {
  resetTypography,
  setTypography,
  styleSelector,
} from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { AvailableFonts, FontWeight } from "@custom-types/styles-types";
import {
  hasEnoughContrast,
  MIN_CONTRAST,
  normaliseHex,
  stepFontSize,
} from "@shared/style/typography-utils";

const COLUMNS = "150px minmax(300px, 1fr) 120px 180px 320px";

interface ColorFieldProps {
  variant: AvailableFonts;
  color: string;
  onChange: (color: string) => void;
}

/** Hex field with a swatch and presets; only a valid colour is saved */
function ColorField({
  variant,
  color,
  onChange,
}: ColorFieldProps): JSX.Element {
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const text = draft ?? color;
  const normal = normaliseHex(text);
  const isInvalid = normal === undefined;
  const isLowContrast = normal !== undefined && !hasEnoughContrast(normal);

  let helperText: string | undefined = undefined;
  if (isInvalid) {
    helperText = "Use a colour like #555555";
  } else if (isLowContrast) {
    helperText = `Low contrast on white (needs ${MIN_CONTRAST}:1)`;
  }

  function handleChange(value: string): void {
    setDraft(value);
    const next = normaliseHex(value);
    if (next !== undefined) {
      onChange(next);
    }
  }

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75 }}>
      <Box
        aria-hidden="true"
        sx={{
          width: 26,
          height: 26,
          mt: 0.5,
          flex: "none",
          borderRadius: 0.5,
          border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
          bgcolor: normal ?? color,
        }}
      />
      <TextField
        size="small"
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={() => setDraft(undefined)}
        error={isInvalid || isLowContrast}
        helperText={helperText}
        slotProps={{
          htmlInput: { "aria-label": `${variant} colour hex` },
        }}
        sx={{ width: 120 }}
      />
      <Box sx={{ display: "flex", gap: 0.5, pt: 1 }}>
        {COLOR_PRESETS.map((preset) => (
          <Box
            key={preset}
            component="button"
            type="button"
            aria-label={`Use ${preset} for ${variant}`}
            onClick={() => {
              setDraft(undefined);
              onChange(preset);
            }}
            sx={{
              width: 18,
              height: 18,
              p: 0,
              cursor: "pointer",
              borderRadius: "50%",
              border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
              bgcolor: preset,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

/** All 8 text styles in one table: size, weight and colour apply at once */
export function TypographyTable(): JSX.Element {
  const dispatch = useAppDispatch();
  const { typography } = useAppSelector(styleSelector);
  const { setHovered } = useStyleHover();

  return (
    <Box
      component="section"
      aria-label="Typography"
      sx={{
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: 1,
        bgcolor: WORKSPACE_COLORS.panel,
        overflow: "auto",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Typography</Typography>
          <Typography variant="body2" sx={{ color: WORKSPACE_COLORS.muted }}>
            Set size, weight and colour for each style. Changes apply at once.
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={() => dispatch(resetTypography())}
        >
          Reset to defaults
        </Button>
      </Box>
      <Box
        role="row"
        sx={{
          display: "grid",
          gridTemplateColumns: COLUMNS,
          gap: 1.25,
          px: 1.75,
          py: 0.75,
          minWidth: 1070,
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
        <span>Colour</span>
      </Box>
      {STYLE_TOKENS.map(({ variant, use, where, sample }) => {
        const style = typography[variant];
        return (
          <Fragment key={variant}>
            <Box
              role="row"
              data-style-row={variant}
              onMouseEnter={() => setHovered(variant)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(variant)}
              onBlur={() => setHovered(null)}
              sx={{
                display: "grid",
                gridTemplateColumns: COLUMNS,
                gap: 1.25,
                alignItems: "center",
                px: 1.75,
                py: 1,
                minWidth: 1070,
                borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
              }}
            >
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                    {variant}
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
                  color: style.color,
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
              <ColorField
                variant={variant}
                color={style.color}
                onChange={(color) =>
                  dispatch(
                    setTypography({ variant, fontStyle: { ...style, color } })
                  )
                }
              />
            </Box>
          </Fragment>
        );
      })}
      <Typography
        variant="body2"
        sx={{ p: 1.5, color: WORKSPACE_COLORS.muted }}
      >
        Text colours should keep a contrast of at least {MIN_CONTRAST}:1 on
        white. A field turns red when one falls below.
      </Typography>
    </Box>
  );
}
