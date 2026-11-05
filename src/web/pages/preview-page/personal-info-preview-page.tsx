import { Grid } from "@mui/material";
import { vaultSelector } from "@store/vault/vault-slice";
import { useAppSelector } from "@store/store-helper";
import { CvTypography } from "@components/cv-typography";

/** Shows the name and headline in preview page */
export function PersonalInfoPreviewPage(): JSX.Element | null {
  const { profile } = useAppSelector(vaultSelector);

  if (!profile.fullName) {
    return null;
  }

  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ m: "0px", p: "0px" }}
    >
      <CvTypography variant="headingLg" text={profile.fullName} />
      <CvTypography variant="bodyLg" text={profile.headline ?? ""} />
    </Grid>
  );
}
