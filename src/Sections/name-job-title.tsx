import { Grid } from "@mui/material";
import { ResumeTitle, SubsectionText } from "../common/custom-typography";
import { useSelector } from "react-redux";
import { applicantSelector } from "../store/applicant/applicant-slice";

export function NameJobTitle(): JSX.Element {
  const { nameJobTitle } = useSelector(applicantSelector);
  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <ResumeTitle text={nameJobTitle.name} />
      <SubsectionText text={nameJobTitle.currentJobTitle} />
    </Grid>
  );
}
