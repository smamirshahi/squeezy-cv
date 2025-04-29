import { Grid2, SvgIcon, SxProps } from "@mui/material";
import { BodyText } from "./custom-typography";

interface Props {
  /** The icon to be shown */
  icon: React.ElementType;

  /** The text to be shown */
  text: string;

  customSx?: SxProps
}

/** Shows an icon with a text next to it */
export function IconWithText({ icon, text, customSx }: Props): JSX.Element {
  return (
    <Grid2 sx={{ mr: "20px" }} container direction="row">
      <SvgIcon
        color="primary"
        component={icon}
        viewBox="0 0 24 24"
        fontSize="small"
      />
      <BodyText text={text} customSx={customSx} />
    </Grid2>
  );
}
