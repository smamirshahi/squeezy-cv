import { Grid } from "@mui/material";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { CvTypography } from "@components/cv-typography";
import { PreviewSection } from "@components/preview-section";

/** Shows the personal info in preview page */
export function PersonalInfoPreviewPage(): JSX.Element | null {
  const { personalInfo } = useAppSelector(cvDataSelector);

  if (!personalInfo.name) {
    return null;
  }

  return (
    <PreviewSection sectionId="personalInfo">
      <Grid
        container
        direction="column"
        alignItems="flex-start"
        sx={{ m: "0px", p: "0px" }}
      >
        <CvTypography variant="headingLg" text={personalInfo.name} />
        <CvTypography variant="bodyLg" text={personalInfo.jobTitle} />
      </Grid>
    </PreviewSection>
  );
}
