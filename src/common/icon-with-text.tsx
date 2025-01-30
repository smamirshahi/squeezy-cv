import { Grid2, SvgIcon } from "@mui/material";
import { JSX } from "react";
import { NormalText } from "./custom-stylings";

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
      <NormalText text={text} />
    </Grid2>
  );
}
