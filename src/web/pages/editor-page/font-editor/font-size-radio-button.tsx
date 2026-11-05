import { WORD_FONT_SIZE_OPTIONS } from "@custom-styles/custom-styles";
import { FontSize } from "@custom-types/styles-types";
import { isValidFontSize } from "@custom-types/type-guards";
import {
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { SetStateFunction } from "@store/store-helper";

interface Props {
  /** The selected size for a font */
  selectedSize: FontSize;

  /** Setter for the selected size for a font */
  setSelectedSize: SetStateFunction<FontSize>;
}

/** List all the font sizes as a radio button */
export function FontSizeRadioButton({
  selectedSize,
  setSelectedSize,
}: Props): JSX.Element {
  return (
    <Box>
      <Typography variant="subtitle2">Size</Typography>
      <RadioGroup
        value={selectedSize}
        onChange={(e) => {
          if (isValidFontSize(e.target.value)) {
            setSelectedSize(e.target.value);
          }
        }}
      >
        {WORD_FONT_SIZE_OPTIONS.map((size) => (
          <FormControlLabel
            key={size}
            value={size}
            control={<Radio size="small" />}
            label={size}
          />
        ))}
      </RadioGroup>
    </Box>
  );
}
