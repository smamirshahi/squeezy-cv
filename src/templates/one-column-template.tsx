import { Grid } from "@mui/material";
import { ContactInformation } from "../sections/contact-information";
import { Experiences } from "../sections/experiences/experiences";
import { NameJobTitle } from "../sections/name-job-title";
import { ProfessionalSummary } from "../sections/professional-summary";
import { Skills } from "../sections/skills";

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
