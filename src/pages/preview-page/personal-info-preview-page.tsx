import { Grid } from "@mui/material";
import { CvTitle, SubsectionText } from "@src/components/cv-typography";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@src/store/store-helper";

export function PersonalInfoPreviewPage(): JSX.Element {
  const { personalInfo } = useAppSelector(cvDataSelector);
  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <CvTitle text={personalInfo.name} />
      <SubsectionText text={personalInfo.jobTitle} />
    </Grid>
  );
}
