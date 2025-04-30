import { Grid2, SvgIcon, SxProps } from "@mui/material";
import { BodyText } from "./custom-typography";

interface Props {
  /** The icon to be shown */
  icon: React.ElementType;

  /** The text to be shown */
  text: string;

  /** Styles for the icon */
  customIconSx?: SxProps

  /** Styles for the text */
  customTextSx?: SxProps
}

/** Shows an icon with a text next to it */
export function IconWithText({ icon, text, customIconSx, customTextSx }: Props): JSX.Element {
  return (
    <Grid2 sx={{ mr: "20px" }} container direction="row">
      <SvgIcon
        color="primary"
        component={icon}
        viewBox="0 0 24 24"
        fontSize="small"
        sx={{...customIconSx}}
      />
      <BodyText text={text} customSx={customTextSx} />
    </Grid2>
  );
}
