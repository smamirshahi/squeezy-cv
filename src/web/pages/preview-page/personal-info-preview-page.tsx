import { Box, Grid } from "@mui/material";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { Profile } from "@custom-types/vault-types";
import { useAppSelector } from "@store/store-helper";
import { CvTypography } from "@components/cv-typography";

/** Shows the name and headline in preview page */
export function PersonalInfoPreviewPage({
  profile,
}: {
  profile: Profile;
}): JSX.Element | null {
  const {
    shouldShowRightToWork,
    shouldShowNationality,
    shouldShowMaritalStatus,
    shouldShowGender,
  } = useAppSelector(styleSelector);

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
      {shouldShowNationality && (profile.nationalities ?? []).length > 0 && (
        <CvTypography
          variant="bodySm"
          text={`Nationality: ${(profile.nationalities ?? []).join(", ")}`}
        />
      )}
      {shouldShowMaritalStatus && profile.maritalStatus && (
        <CvTypography
          variant="bodySm"
          text={`Marital status: ${profile.maritalStatus}`}
        />
      )}
      {shouldShowGender && profile.gender && (
        <CvTypography variant="bodySm" text={`Gender: ${profile.gender}`} />
      )}
      {shouldShowRightToWork && profile.rightToWork && (
        <CvTypography variant="bodySm" text={profile.rightToWork} />
      )}
    </Grid>
  );
}

/** The photo of the header: a 4:5 frame, already cropped to fit */
function HeaderPhoto({ profile }: { profile: Profile }): JSX.Element | null {
  if (!profile.photo) {
    return null;
  }
  return (
    <Box
      component="img"
      src={profile.photo}
      alt={`Photo of ${profile.fullName}`}
      sx={{
        width: "28mm",
        height: "35mm",
        objectFit: "cover",
        borderRadius: "2px",
        flex: "none",
        breakInside: "avoid",
      }}
    />
  );
}

/** The header parts (name, contact) on the left and the photo on the right, side by side */
export function HeaderWithPhoto({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
      <HeaderPhoto profile={profile} />
    </Box>
  );
}
