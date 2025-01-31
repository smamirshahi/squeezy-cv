import { Grid2 } from "@mui/material";
import { Application } from "../applicant";
import { ContactInformation } from "../Sections/contact-information";
import { Experiences } from "../Sections/experiences/experiences";
import { NameJobTitle } from "../Sections/name-job-title";
import { ProfessionalSummary } from "../Sections/professional-summary";
import { Skills } from "../Sections/skills";
import { JSX } from "react";

/** Two column template */
export function TwoColumnTemplate(): JSX.Element {
  return (
    <Grid2
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="flex-start"
    >
      <NameJobTitle nameJobTitle={Application.nameJobTitle} />
      <ContactInformation contactInformation={Application.contactInformation} />
      <ProfessionalSummary summary={Application.professionalSummary} />
      <Experiences
        sectionTitle="Work Experience"
        experiences={Application.workExperiences}
      />
      <Experiences
        sectionTitle="Education"
        experiences={Application.education}
      />
      <Skills />
    </Grid2>
  );
}
