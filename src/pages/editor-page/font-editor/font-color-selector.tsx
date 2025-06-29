import { AvailableFonts, FontStyle } from "@custom-types/styles-types";
import { Box, Button, Popover } from "@mui/material";
import { setTypography } from "@store/cv-data/cv-data-slice";
import { useAppDispatch } from "@store/store-helper";
import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

interface Props {
  /** The variant of the font */
  variant: AvailableFonts;

  /** The style of the font */
  fontStyle: FontStyle;
}

/** Allows user to select a color for a specific font */
export function FontColorSelector({ variant, fontStyle }: Props): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const isOpen = Boolean(anchorEl);
  const id = isOpen ? "simple-popover" : undefined;
  const [newColor, setNewColor] = useState<string>(fontStyle.color);
  const dispatch = useAppDispatch();

  function onPopoverClose(): void {
    setAnchorEl(null);
    dispatch(
      setTypography({
        variant,
        fontStyle: {
          fontSize: fontStyle.fontSize,
          fontWeight: fontStyle.fontWeight,
          color: newColor,
        },
      })
    );
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
