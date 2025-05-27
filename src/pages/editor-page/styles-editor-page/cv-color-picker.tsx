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

export function CvColorPicker(): JSX.Element {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [fontsize, setFontsize] = useState<number>(10);

  const isOpen = Boolean(anchorEl);
  const id = isOpen ? "simple-popover" : undefined;
  const [color, setColor] = useState<string>("#aabbcc");
  const textColor = theme.palette.getContrastText(color);

  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <Typography>Subtitle</Typography>
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel id="number-label">Font Size</InputLabel>
        <Select
          labelId="number-label"
          id="number-select"
          value={fontsize}
          label="Font Size"
          onChange={(event) => setFontsize(event.target.value as number)}
        >
          {[...Array(7)].map((_, i) => {
            const num = 11 + i;
            return (
              <MenuItem key={num} value={num}>
                {num}
              </MenuItem>
            );
          })}
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
