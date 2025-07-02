import { SvgIcon } from "@mui/material";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { useCvTypographyUtils } from "@components/cv-typography-utils";

interface Props {
  /** The icon to be shown */
  icon: React.ElementType;
}

/** Wraps an svg icon and make the color based on the user selection */
export function CvIcon({ icon }: Props): JSX.Element {
  const { typography } = useAppSelector(styleSelector);
  const { isTextSelected } = useCvTypographyUtils();

  return (
    <SvgIcon
      component={icon}
      viewBox="0 0 24 24"
      fontSize="small"
      sx={{
        color: typography.icon.color,
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        opacity: isTextSelected("icon") ? 1 : 0.2,
      }}
    />
  );
}
