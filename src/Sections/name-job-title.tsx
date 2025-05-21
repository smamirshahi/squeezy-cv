import { Grid } from "@mui/material";
import { ResumeTitle, SubsectionText } from "../common/custom-typography";
import { useSelector } from "react-redux";
import { cvDataSelector } from "../store/applicant/applicant-slice";

export function NameJobTitle(): JSX.Element {
  const { personalInfo } = useSelector(cvDataSelector);
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
