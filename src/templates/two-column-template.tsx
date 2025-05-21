import { Grid } from "@mui/material";
import { ContactInformation } from "../Sections/contact-information";
import { Experiences } from "../Sections/experiences/experiences";
import { NameJobTitle } from "../Sections/name-job-title";
import { ProfessionalSummary } from "../Sections/professional-summary";
import { Skills } from "../Sections/skills";

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
