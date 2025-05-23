import { Grid } from "@mui/material";
import { ResumeTitle, SubsectionText } from "../../common/custom-typography";
import { cvDataSelector } from "../../store/cv-data/cv-data-slice";
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
      <ResumeTitle text={personalInfo.name} />
      <SubsectionText text={personalInfo.jobTitle} />
    </Grid>
  );
}
