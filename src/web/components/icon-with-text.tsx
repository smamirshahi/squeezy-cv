import { Grid } from "@components/ui";
import { CvTypography } from "@components/cv-typography";
import { CvIcon } from "@components/cv-icon";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
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
  const { shouldShowIcons } = useAppSelector(styleSelector);

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
      {shouldShowIcons !== false && <CvIcon icon={icon} />}
      <CvTypography variant={variant} text={text} />
    </Grid>
  );
}
