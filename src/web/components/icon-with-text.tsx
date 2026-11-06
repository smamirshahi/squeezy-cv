import { Grid } from "@mui/material";
import { CvTypography } from "@components/cv-typography";
import { CvIcon } from "@components/cv-icon";
import { AvailableFonts } from "@custom-types/styles-types";

interface Props {
  /** The icon to be shown */
  icon: React.ElementType;

  /** The variant of the typography */
  variant: AvailableFonts;

  /** The text to be shown */
  text: string;
}

/** Shows an icon with a text next to it */
export function IconWithText({
  variant,
  icon,
  text,
}: Props): JSX.Element | null {
  if (!text) {
    return null;
  }

  return (
    <Grid
      container
      direction="row"
      sx={{
        alignItems: "center",
        gap: 0.5,
        mr: "20px",
      }}
    >
      <CvIcon icon={icon} />
      <CvTypography variant={variant} text={text} />
    </Grid>
  );
}
