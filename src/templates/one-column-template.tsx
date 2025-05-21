import { Grid } from "@mui/material";
import { ContactInformation } from "../Sections/contact-information";
import { Experiences } from "../Sections/experiences/experiences";
import { NameJobTitle } from "../Sections/name-job-title";
import { ProfessionalSummary } from "../Sections/professional-summary";
import { Skills } from "../Sections/skills";

/** One column template */
export function OneColumnTemplate(): JSX.Element | null {
  return (
    <Grid
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="flex-start"
    >
      <NameJobTitle />
      <ContactInformation />
      <ProfessionalSummary />
      <Experiences sectionTitle="Work Experience" />
      <Experiences sectionTitle="Education" />
      <Skills />
    </Grid>
  );
}
