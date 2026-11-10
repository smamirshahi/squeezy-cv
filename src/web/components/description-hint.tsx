import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { InputAdornment, Tooltip } from "@mui/material";
import { DESCRIPTION_HINT } from "@shared/vault/item-fields";

interface Props {
  /** Text of the tooltip; defaults to the Description hint */
  hint?: string;

  /** Top right for a multiline field; centred (the default) for a one-line field */
  isMultiline?: boolean;
}

/** The (i) icon with a tooltip, placed at the top right inside a multiline field */
export function HintAdornment({
  hint = DESCRIPTION_HINT,
  isMultiline = true,
}: Props): JSX.Element {
  return (
    <InputAdornment
      position="end"
      sx={isMultiline ? { alignSelf: "flex-start", mt: 0.5 } : undefined}
    >
      <Tooltip title={hint}>
        <InfoOutlinedIcon
          fontSize="small"
          tabIndex={0}
          aria-label="About this field"
          sx={{ color: "text.secondary", cursor: "help" }}
        />
      </Tooltip>
    </InputAdornment>
  );
}
