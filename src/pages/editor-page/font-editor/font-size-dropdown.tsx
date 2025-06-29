import { WORD_FONT_SIZE_OPTIONS } from "@custom-styles/custom-styles";
import { AvailableFonts, FontStyle } from "@custom-types/styles-types";
import { isValidFontSize } from "@custom-types/type-guards";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { setTypography } from "@store/cv-data/cv-data-slice";
import { useAppDispatch } from "@store/store-helper";

interface Props {
  /** The variant of the font */
  variant: AvailableFonts;

  /** The style of the font */
  fontStyle: FontStyle;
}

/** A dropdown to select font size */
export function FontSizeDropdown({ variant, fontStyle }: Props): JSX.Element {
  const dispatch = useAppDispatch();

  return (
    <FormControl size="small" sx={{ minWidth: 100 }}>
      <InputLabel id="fontSize-label">Font Size</InputLabel>
      <Select
        id="fontSize-select"
        value={fontStyle.fontSize}
        label="Font Size"
        onChange={(event) => {
          const newFontSize = event.target.value;
          if (isValidFontSize(newFontSize)) {
            dispatch(
              setTypography({
                variant,
                fontStyle: {
                  fontSize: newFontSize,
                  fontWeight: fontStyle.fontWeight,
                  color: fontStyle.color,
                },
              })
            );
          }
        }}
      >
        {WORD_FONT_SIZE_OPTIONS.map((pt) => (
          <MenuItem key={pt} value={pt}>
            {pt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
