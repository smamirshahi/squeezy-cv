import { Grid2, SvgIcon } from "@mui/material";
import { BodyText } from "./custom-typography";

interface Props {
  /** The icon to be shown */
  icon: React.ElementType;

  /** The text to be shown */
  text: string;
}

/** Shows an icon with a text next to it */
export function IconWithText({ icon, text }: Props): JSX.Element {
  return (
    <Grid2 sx={{ mr: "20px" }} container direction="row">
      <SvgIcon
        color="primary"
        component={icon}
        viewBox="0 0 24 24"
        fontSize="small"
      />
      <BodyText text={text} />
    </Grid2>
  );
}
