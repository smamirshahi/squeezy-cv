import { Grid2, SvgIcon, Typography } from "@mui/material";
import { JSX } from "react";

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
      <Typography sx={{ fontSize: "10pt", fontFamily: "Calibri, sans-serif" }}>
        {text}
      </Typography>
    </Grid2>
  );
}
