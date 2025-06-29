import { WORD_FONT_WEIGHT_OPTIONS } from "@custom-styles/custom-styles";
import { FontWeight } from "@custom-types/styles-types";
import { isValidFontWeight } from "@custom-types/type-guards";
import {
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { SetStateFunction } from "@store/store-helper";

interface Props {
  /** The selected weight for a font */
  selectedWeight: FontWeight;

  /** Setter for the selected weight for a font */
  setSelectedWeight: SetStateFunction<FontWeight>;
}

/** List all the font weights as a radio button */
export function FontWeightRadioButton({
  selectedWeight,
  setSelectedWeight,
}: Props): JSX.Element {
  return (
    <Box>
      <Typography variant="subtitle2">Weight</Typography>
      <RadioGroup
        value={selectedWeight}
        onChange={(e) => {
          if (isValidFontWeight(e.target.value)) {
            setSelectedWeight(e.target.value);
          }
        }}
      >
        {WORD_FONT_WEIGHT_OPTIONS.map((weight) => (
          <FormControlLabel
            key={weight}
            value={weight}
            control={<Radio size="small" />}
            label={weight}
          />
        ))}
      </RadioGroup>
    </Box>
  );
}
