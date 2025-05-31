import { Typography } from "@mui/material";
import { typographyVariantSelector } from "@store/cv-data/cv-data-slice";
import { AvailableFonts } from "@store/cv-data/cv-data-slice-helper";
import { useAppSelector } from "@store/store-helper";

interface TypographyVariantProps {
  /** The variant of the typography */
  variant: AvailableFonts;

  /** The text to display */
  text: string;
}

export function CvTypographyNew({
  variant,
  text,
}: TypographyVariantProps): JSX.Element {
  const typographyVariant = useAppSelector(typographyVariantSelector);

  return (
    <Typography sx={typographyVariant[variant]} gutterBottom>
      {text}
    </Typography>
  );
}
