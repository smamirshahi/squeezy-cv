import { SectionTitle, SubsectionText } from "../common/custom-typography";
import { Box, Grid2 } from "@mui/material";
import { SkillWithLevel } from "../common/skill-with-level";

// FIXME: This needs to be completed
/** Skills section (Areas of Expertise) */
export function Skills(): JSX.Element {
  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <SectionTitle text="Skills" />
      <SubsectionText text="Language" />
      <SkillWithLevel skillName="English" percentage={85} type="star" />
      <SubsectionText text="Technical Skills" />
      <SubsectionText text="General Skills" />
      <Box sx={{ width: "100%" }}></Box>
    </Grid2>
  );
}
