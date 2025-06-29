import { Box, Button, Popover } from "@mui/material";
import { SetStateFunction } from "@store/store-helper";
import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

interface Props {
  /** The selected color for a font */
  selectedColor: string;

  /** Setter for the selected color for a font */
  setSelectedColor: SetStateFunction<string>;
}

/** Allows user to select a color for a specific font */
export function FontColorSelector({
  selectedColor,
  setSelectedColor,
}: Props): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const isOpen = Boolean(anchorEl);
  const id = isOpen ? "simple-popover" : undefined;
  const [newColor, setNewColor] = useState<string>(selectedColor);

  function onPopoverClose(): void {
    setAnchorEl(null);
    setSelectedColor(newColor);
    // dispatch(
    //   setTypography({
    //     variant,
    //     fontStyle: {
    //       fontSize: fontStyle.fontSize,
    //       fontWeight: fontStyle.fontWeight,
    //       color: newColor,
    //     },
    //   })
    // );
  }

  return (
    <>
      <Button
        aria-describedby={id}
        variant="contained"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          backgroundColor: newColor,
        }}
      >
        {newColor}
      </Button>

      <Popover
        id={id}
        open={isOpen}
        anchorEl={anchorEl}
        onClose={onPopoverClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Box component="div" sx={{ p: 2 }}>
          <HexColorPicker
            color={newColor}
            onChange={(newColor) => setNewColor(newColor)}
          />
          <HexColorInput
            color={newColor}
            onChange={(newColor) => setNewColor(newColor)}
          />
        </Box>
      </Popover>
    </>
  );
}
