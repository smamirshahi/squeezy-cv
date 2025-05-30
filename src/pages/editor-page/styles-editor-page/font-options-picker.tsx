import { HexColorPicker, HexColorInput } from "react-colorful";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { AvailableFonts, FontStyle } from "@store/cv-data/cv-data-slice-helper";
import { useAppDispatch } from "@store/store-helper";
import { setTypography } from "@store/cv-data/cv-data-slice";

interface Props {
  /** The variant of the font */
  variant: AvailableFonts;

  /** The style of the font */
  style: FontStyle;
}

export function FontOptionsPicker({ variant, style }: Props): JSX.Element {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [fontStyle, setFontStyle] = useState<FontStyle>(style);

  const isOpen = Boolean(anchorEl);
  const id = isOpen ? "simple-popover" : undefined;
  const textColor = theme.palette.getContrastText(fontStyle.color);

  useEffect(() => {
    dispatch(setTypography({ variant, fontStyle }));
  }, [dispatch, fontStyle, variant]);

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={2}
      sx={{ mt: "10px" }}
    >
      <Typography>{variant}</Typography>
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel id="fontSize-label">Font Size</InputLabel>
        <Select
          labelId="fontSize-label"
          id="fontSize-select"
          value={fontStyle.fontSize}
          label="Font Size"
          onChange={(event) =>
            setFontStyle((prev) => ({
              ...prev,
              fontSize: event.target.value,
            }))
          }
        >
          {Array.from({ length: 15 }, (_, i) => i + 8).map((pt) => (
            <MenuItem key={pt} value={`${pt}pt`}>
              {pt} pt
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel id="fontWeight-label">Font Weight</InputLabel>
        <Select
          labelId="fontWeight-label"
          id="fontWeight-select"
          value={fontStyle.fontWeight}
          label="Font Weight"
          onChange={(event) =>
            setFontStyle((prev) => ({
              ...prev,
              fontWeight: event.target.value as number,
            }))
          }
        >
          {[400, 500, 600, 700].map((weight) => (
            <MenuItem key={weight} value={weight}>
              {weight}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        aria-describedby={id}
        variant="contained"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          backgroundColor: fontStyle.color,
          color: textColor,
        }}
      >
        {fontStyle.color}
      </Button>

      <Popover
        id={id}
        open={isOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Box sx={{ p: 2 }}>
          <HexColorPicker
            color={fontStyle.color}
            onChange={(color) =>
              setFontStyle((prev) => ({
                ...prev,
                color,
              }))
            }
          />
          <HexColorInput
            color={fontStyle.color}
            onChange={(color) =>
              setFontStyle((prev) => ({
                ...prev,
                color,
              }))
            }
          />
        </Box>
      </Popover>
    </Stack>
  );
}
