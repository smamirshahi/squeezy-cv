import { AvailableFonts } from "@custom-types/styles-types";
import { Typography } from "@mui/material";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";

interface TypographyVariantProps {
  /** The variant of the typography */
  variant: AvailableFonts;

  /** The text to display */
  text: string;
}

/** Creates a new typography which is connected to store */
export function CvTypography({
  variant,
  text,
}: TypographyVariantProps): JSX.Element {
  const { typography } = useAppSelector(styleSelector);

  return (
    <Typography
      sx={{ ...typography[variant], p: "0px", m: "0px" }}
      gutterBottom
    >
      {text}
    </Typography>
  );
}
