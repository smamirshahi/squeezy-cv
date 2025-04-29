import { Grid2 } from "@mui/material";
import { ResumeTitle, SubsectionText } from "../common/custom-typography";
import { NameJobTitleProps } from "../common/custom-types";

interface Props {
  /** Name and job title */
  nameJobTitle: NameJobTitleProps;
}

export function NameJobTitle({ nameJobTitle }: Props): JSX.Element {
  return (
    <Grid2
      container
      direction="column"
      alignItems="flex-start"
      sx={{ mb: "20px" }}
    >
      <ResumeTitle text={nameJobTitle.name} />
      <SubsectionText text={nameJobTitle.currentJobTitle} />
    </Grid2>
  );
}
