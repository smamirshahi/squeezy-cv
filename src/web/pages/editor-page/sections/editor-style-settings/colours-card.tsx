import { useState } from "react";
import {
  Box,
  Button,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@components/ui";
import { ArrowDropDownOutlined, InfoOutlined } from "@components/ui/icons";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  COLOR_PALETTE,
  PALETTE_LABELS,
} from "@pages/editor-page/sections/editor-style-settings/style-tokens";
import { ColourArea } from "@pages/editor-page/sections/editor-style-settings/colour-area";
import { useResolvedStyle } from "@hooks/use-resolved-style";
import { setColors } from "@store/cv-data/cv-data-slice";
import { useAppDispatch } from "@store/store-helper";
import {
  contrastOnWhite,
  hasEnoughContrast,
  MIN_CONTRAST,
  normaliseHex,
} from "@shared/style/typography-utils";

const SWATCH_PX = 22;
const CONTRAST_DECIMALS = 1;
/** Where the picker starts for a colour that is not set (the accent) */
const START_COLOR = "#1f3a5f";

interface ColorPickerProps {
  /** Names the picker for screen readers and tests, e.g. "Text" */
  label: string;
  /** What this colour is used for */
  hint: string;
  /** The colour now; undefined = none chosen */
  color: string | undefined;
  onChange: (color: string) => void;
  /** Adds a "No <label>" button that removes the colour */
  onClear?: () => void;
}

interface SwatchProps {
  color: string;
  label: string;
  isSelected: boolean;
  onPick: () => void;
}

/** One colour of the palette */
function Swatch({
  color,
  label,
  isSelected,
  onPick,
}: SwatchProps): JSX.Element {
  return (
    <Box
      component="button"
      type="button"
      aria-label={`Use ${color} for ${label}`}
      aria-pressed={isSelected}
      title={color}
      onClick={onPick}
      sx={{
        width: SWATCH_PX,
        height: SWATCH_PX,
        p: 0,
        cursor: "pointer",
        borderRadius: 0.5,
        bgcolor: color,
        border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
        outline: isSelected ? `2px solid ${WORKSPACE_COLORS.accent}` : "none",
        outlineOffset: 1,
      }}
    />
  );
}

/** A colour button that opens a palette (like Word's) with a hex field at the bottom */
function ColorPicker({
  label,
  hint,
  color,
  onChange,
  onClear,
}: ColorPickerProps): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const text = draft ?? color ?? "";
  const isInvalid = draft !== undefined && normaliseHex(draft) === undefined;
  const isLowContrast = color !== undefined && !hasEnoughContrast(color);

  function pick(next: string): void {
    setDraft(undefined);
    onChange(next);
  }

  function handleType(value: string): void {
    setDraft(value);
    const next = normaliseHex(value);
    if (next !== undefined) {
      onChange(next);
    }
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{label}</Typography>
      <Typography
        sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted, mb: 0.75 }}
      >
        {hint}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Button
          variant="outlined"
          size="small"
          aria-label={`${label} colour`}
          aria-haspopup="dialog"
          onClick={(event) => setAnchor(event.currentTarget)}
          startIcon={
            <Box
              aria-hidden="true"
              sx={{
                width: SWATCH_PX,
                height: SWATCH_PX,
                borderRadius: 0.5,
                bgcolor: color ?? "#fff",
                border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
              }}
            />
          }
          endIcon={<ArrowDropDownOutlined />}
          sx={{ textTransform: "none", justifyContent: "flex-start" }}
        >
          {color ?? "None"}
        </Button>
        {isLowContrast && color !== undefined && (
          <Tooltip
            title={`Hard to read on white paper and in print: contrast ${contrastOnWhite(
              color
            ).toFixed(
              CONTRAST_DECIMALS
            )}:1, it should be at least ${MIN_CONTRAST}:1. Pick a darker colour.`}
          >
            <InfoOutlined
              tabIndex={0}
              aria-label={`Low contrast on white for ${label}`}
              sx={{ fontSize: 18, color: "error.main" }}
            />
          </Tooltip>
        )}
      </Box>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => {
          setAnchor(null);
          setDraft(undefined);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box
          sx={{ p: 1.5, width: 248, maxWidth: "calc(100vw - 32px)" }}
          role="dialog"
          aria-label={`${label} colours`}
        >
          {onClear && (
            <Button
              size="small"
              disabled={color === undefined}
              onClick={() => {
                setDraft(undefined);
                onClear();
              }}
              sx={{ mb: 1 }}
            >
              No {label.toLowerCase()}
            </Button>
          )}
          {COLOR_PALETTE.map((row, index) => (
            <Box key={PALETTE_LABELS[index]} sx={{ mb: 1 }}>
              <Typography
                sx={{ fontSize: 11, color: WORKSPACE_COLORS.muted, mb: 0.5 }}
              >
                {PALETTE_LABELS[index]}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {row.map((swatch) => (
                  <Swatch
                    key={swatch}
                    color={swatch}
                    label={label}
                    isSelected={swatch === color}
                    onPick={() => pick(swatch)}
                  />
                ))}
              </Box>
            </Box>
          ))}
          <ColourArea
            color={color ?? START_COLOR}
            label={label}
            onChange={pick}
          />
          <TextField
            size="small"
            fullWidth
            sx={{ mt: 2 }}
            label="Hex colour"
            value={text}
            onChange={(event) => handleType(event.target.value)}
            error={isInvalid}
            helperText={isInvalid ? "Use a colour like #555555" : undefined}
            slotProps={{ htmlInput: { "aria-label": `${label} colour hex` } }}
          />
        </Box>
      </Popover>
    </Box>
  );
}

/** The few colours of the CV: text, secondary text and an optional accent (#283) */
export function ColoursCard(): JSX.Element {
  const dispatch = useAppDispatch();
  const { colors } = useResolvedStyle();

  return (
    <Box
      component="section"
      aria-label="Colours"
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
        Two colours and an optional accent are enough, and they print well in
        black and white.
      </Typography>
      <ColorPicker
        label="Text"
        hint="Name, headings, body, skills"
        color={colors.text}
        onChange={(text) => dispatch(setColors({ text }))}
      />
      <ColorPicker
        label="Secondary"
        hint="Dates and contact line"
        color={colors.secondary}
        onChange={(secondary) => dispatch(setColors({ secondary }))}
      />
      <ColorPicker
        label="Accent"
        hint="Section titles, line, symbols"
        color={colors.accent}
        onChange={(accent) => dispatch(setColors({ accent }))}
        onClear={() => dispatch(setColors({ accent: null }))}
      />
    </Box>
  );
}
