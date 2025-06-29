import { WORD_FONT_WEIGHT_OPTIONS } from "@custom-styles/custom-styles";
import { AvailableFonts, FontStyle } from "@custom-types/styles-types";
import { isValidFontWeight } from "@custom-types/type-guards";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { setTypography } from "@store/cv-data/cv-data-slice";
import { useAppDispatch } from "@store/store-helper";

interface Props {
  /** The variant of the font */
  variant: AvailableFonts;

  /** The style of the font */
  fontStyle: FontStyle;
}

/** A dropdown to select font weight */
export function FontWeightDropdown({ variant, fontStyle }: Props): JSX.Element {
  const dispatch = useAppDispatch();

  return (
    <FormControl size="small">
      <InputLabel id="fontWeight-label">Weight</InputLabel>
      <Select
        id="fontWeight-select"
        value={fontStyle.fontWeight}
        label="Weight"
        onChange={(event) => {
          const newFontWeight = event.target.value;
          if (isValidFontWeight(newFontWeight)) {
            dispatch(
              setTypography({
                variant,
                fontStyle: {
                  fontSize: fontStyle.fontSize,
                  fontWeight: newFontWeight,
                  color: fontStyle.color,
                },
              })
            );
          }
        }}
      >
        {WORD_FONT_WEIGHT_OPTIONS.map((weight) => (
          <MenuItem key={weight} value={weight}>
            {weight}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
