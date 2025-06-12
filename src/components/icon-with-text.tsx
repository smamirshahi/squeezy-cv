import { Grid } from "@mui/material";
import { AvailableFonts } from "@custom-styles/custom-styles";
import { CvTypography } from "@components/cv-typography";
import { CvIcon } from "@components/cv-icon";

interface Props {
  /** The icon to be shown */
  icon: React.ElementType;

  /** The variant of the typography */
  variant?: AvailableFonts;

  /** The text to be shown */
  text?: string;
}

/** Shows an icon with a text next to it */
export function IconWithText({
  variant = "bulletText",
  icon,
  text,
}: Props): JSX.Element | null {
  if (!text) {
    return null;
  }

  return (
    <Grid container sx={{ mr: "20px" }} direction="row">
      <CvIcon icon={icon} />
      <CvTypography variant={variant} text={text} />
    </Grid>
  );
}
