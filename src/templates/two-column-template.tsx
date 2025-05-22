import { Grid } from "@mui/material";
import { ContactInformation } from "../sections/contact-information";
import { Experiences } from "../sections/experiences/experiences";
import { NameJobTitle } from "../sections/name-job-title";
import { ProfessionalSummary } from "../sections/professional-summary";
import { Skills } from "../sections/skills";

/** Two column template */
export function TwoColumnTemplate(): JSX.Element | null {
  return (
    <Grid
      container
      direction="row"
      justifyContent="flex-start"
      alignItems="flex-start"
    >
      <NameJobTitle />
      <Grid size={{ xs: 8 }}>
        <ProfessionalSummary />
        <Experiences sectionTitle="Work Experience" />
        <Experiences sectionTitle="Education" />
      </Grid>
      <Grid size={{ xs: 4 }}>
        <ContactInformation />
        <Skills />
      </Grid>
    </Grid>
  );
}
