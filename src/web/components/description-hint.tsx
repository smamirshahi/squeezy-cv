import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { InputAdornment, Tooltip } from "@mui/material";
import { DESCRIPTION_HINT } from "@shared/vault/item-fields";

interface Props {
  /** Text of the tooltip; defaults to the Description hint */
  hint?: string;
}

/** The (i) icon with a tooltip, placed at the top right inside a multiline field */
export function HintAdornment({ hint = DESCRIPTION_HINT }: Props): JSX.Element {
  return (
    <InputAdornment position="end" sx={{ alignSelf: "flex-start", mt: 0.5 }}>
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
