import { Grid, SvgIcon, SxProps } from "@mui/material";
import { BodyText } from "@components/cv-typography-old";

interface Props {
  /** The icon to be shown */
  icon: React.ElementType;

  /** The text to be shown */
  text?: string;

  /** Styles for the icon */
  customIconSx?: SxProps;

  /** Styles for the text */
  customTextSx?: SxProps;
}

/** Shows an icon with a text next to it */
export function IconWithText({
  icon,
  text,
  customIconSx,
  customTextSx,
}: Props): JSX.Element | null {
  if (!text) {
    return null;
  }

  return (
    <Grid container sx={{ mr: "20px" }} direction="row">
      <SvgIcon
        color="primary"
        component={icon}
        viewBox="0 0 24 24"
        fontSize="small"
        sx={{ ...customIconSx }}
      />
      <BodyText text={text} customSx={customTextSx} />
    </Grid>
  );
}
