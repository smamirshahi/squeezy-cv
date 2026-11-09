import { SvgIcon } from "@mui/material";
import { useResolvedStyle } from "@hooks/use-resolved-style";
import { useCvTypographyUtils } from "@components/cv-typography-utils";

interface Props {
  /** The icon to be shown */
  icon: React.ElementType;
}

/** Wraps an svg icon and make the color based on the user selection */
export function CvIcon({ icon }: Props): JSX.Element {
  const { typography } = useResolvedStyle();
  const { opacity } = useCvTypographyUtils();

  return (
    <SvgIcon
      component={icon}
      viewBox="0 0 24 24"
      fontSize="small"
      sx={{
        color: typography.icon.color,
        opacity: opacity("icon"),
      }}
    />
  );
}
