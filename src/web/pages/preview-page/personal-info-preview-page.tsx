import { Grid } from "@mui/material";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { vaultSelector } from "@store/vault/vault-slice";
import { useAppSelector } from "@store/store-helper";
import { CvTypography } from "@components/cv-typography";

/** Shows the name and headline in preview page */
export function PersonalInfoPreviewPage(): JSX.Element | null {
  const { profile } = useAppSelector(vaultSelector);
  const { shouldShowRightToWork } = useAppSelector(styleSelector);

  if (!profile.fullName) {
    return null;
  }

  return (
    <Grid
      container
      sx={{
        flexDirection: "column",
        alignItems: "flex-start",
        m: "0px",
        p: "0px",
      }}
    >
      <CvTypography variant="headingLg" text={profile.fullName} />
      <CvTypography variant="bodyLg" text={profile.headline ?? ""} />
      {shouldShowRightToWork && profile.rightToWork && (
        <CvTypography variant="bodySm" text={profile.rightToWork} />
      )}
    </Grid>
  );
}
