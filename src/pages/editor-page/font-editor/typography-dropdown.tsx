import { useState } from "react";
import { Button, Popover, Box } from "@mui/material";
import { useAppDispatch } from "@store/store-helper";
import { setTypography } from "@store/cv-data/cv-data-slice";
import {
  AvailableFonts,
  FontSize,
  FontStyle,
  FontWeight,
} from "@custom-types/styles-types";
import { FontWeightRadioButton } from "@pages/editor-page/font-editor/font-weight-radio-button";
import { FontSizeRadioButton } from "@pages/editor-page/font-editor/font-size-radio-button";

interface Props {
  /** The variant of the font */
  variant: AvailableFonts;

  /** The style of the font */
  fontStyle: FontStyle;
}

export function TypographyDropdown({ variant, fontStyle }: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [selectedSize, setSelectedSize] = useState<FontSize>(
    fontStyle.fontSize
  );
  const [selectedWeight, setSelectedWeight] = useState<FontWeight>(
    fontStyle.fontWeight
  );

  function handleApply(): void {
    dispatch(
      setTypography({
        variant,
        fontStyle: {
          fontSize: selectedSize,
          fontWeight: selectedWeight,
          color: fontStyle.color,
        },
      })
    );
    setAnchorEl(null);
  }

  return (
    <>
      <Button
        variant="contained"
        size="small"
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        Typography
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Box display="flex" p={2} gap={4}>
          <FontSizeRadioButton
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
          />
          <FontWeightRadioButton
            selectedWeight={selectedWeight}
            setSelectedWeight={setSelectedWeight}
          />
        </Box>
        <Box display="flex" justifyContent="flex-end" p={1}>
          <Button onClick={handleApply} size="small" variant="contained">
            Apply
          </Button>
        </Box>
      </Popover>
    </>
  );
}
