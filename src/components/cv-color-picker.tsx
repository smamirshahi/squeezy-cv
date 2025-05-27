import { HexColorPicker, HexColorInput } from "react-colorful";
import { useState } from "react";
import { Button, Popover, useTheme } from "@mui/material";

export function CvColorPicker(): JSX.Element {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const isOpen = Boolean(anchorEl);
  const id = isOpen ? "simple-popover" : undefined;
  const [color, setColor] = useState("#aabbcc");
  const textColor = theme.palette.getContrastText(color);

  return (
    <div>
      <Button
        aria-describedby={id}
        variant="contained"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          backgroundColor: color,
          color: textColor,
        }}
      >
        Open Popover
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
        <HexColorPicker color={color} onChange={setColor} />
        <HexColorInput color={color} onChange={setColor} />
      </Popover>
    </div>
  );
}
