import { Grid } from "@mui/material";
import { ContactInformation } from "../Sections/contact-information";
import { Experiences } from "../Sections/experiences/experiences";
import { NameJobTitle } from "../Sections/name-job-title";
import { ProfessionalSummary } from "../Sections/professional-summary";
import { Skills } from "../Sections/skills";
import { useSelector } from "react-redux";
import { applicantSelector } from "../store/applicant/applicant-slice";

/** Two column template */
export function TwoColumnTemplate(): JSX.Element | null {
  const applicant = useSelector(applicantSelector);

  if (applicant === null) {
    return null;
  }

  return (
    <Grid
      container
      direction="row"
      justifyContent="flex-start"
      alignItems="flex-start"
    >
      <NameJobTitle nameJobTitle={applicant.nameJobTitle} />
      <Grid size={{ xs: 8 }}>
        <ProfessionalSummary summary={applicant.professionalSummary} />
        <Experiences
          sectionTitle="Work Experience"
          experiences={applicant.workExperiences}
        />
        <Experiences
          sectionTitle="Education"
          experiences={applicant.education}
        />
      </Grid>
      <Grid size={{ xs: 4 }}>
        <ContactInformation contactInformation={applicant.contactInformation} />
        <Skills
          skills={applicant.skills}
          indicatorType={applicant.style.skillIndicatorType}
        />
      </Grid>
    </Grid>
  );
}
