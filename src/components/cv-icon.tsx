import { SvgIcon } from "@mui/material";
import { typographyVariantSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";

interface Props {
  /** The icon to be shown */
  icon: React.ElementType;
}

/** Wraps an svg icon and make the color */
export function CvIcon({ icon }: Props): JSX.Element {
  const typographyVariant = useAppSelector(typographyVariantSelector);

  return (
    <SvgIcon
      component={icon}
      viewBox="0 0 24 24"
      fontSize="small"
      sx={{
        color: typographyVariant.icon.color,
      }}
    />
  );
}
