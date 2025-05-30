import { HexColorPicker, HexColorInput } from "react-colorful";
import { useState } from "react";
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

interface Props {
  fontTitle: AvailableFonts;

  style: FontStyle;
}

export function FontOptionsPicker({ fontTitle, style }: Props): JSX.Element {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [fontsize, setFontsize] = useState<string>(style.fontSize);
  const [color, setColor] = useState<string>(style.color);
  const [fontWeight, setFontWeight] = useState<number>(style.fontWeight);

  const isOpen = Boolean(anchorEl);
  const id = isOpen ? "simple-popover" : undefined;
  const textColor = theme.palette.getContrastText(color);

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={2}
      sx={{ mt: "10px" }}
    >
      <Typography>{fontTitle}</Typography>
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel id="fontSize-label">Font Size</InputLabel>
        <Select
          labelId="fontSize-label"
          id="fontSize-select"
          value={fontsize}
          label="Font Size"
          onChange={(event) => setFontsize(event.target.value)}
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
          value={fontWeight}
          label="Font Weight"
          onChange={(event) => setFontWeight(event.target.value as number)}
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
          backgroundColor: color,
          color: textColor,
        }}
      >
        {color}
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
          <HexColorPicker color={color} onChange={setColor} />
          <HexColorInput color={color} onChange={setColor} />
        </Box>
      </Popover>
    </Stack>
  );
}
