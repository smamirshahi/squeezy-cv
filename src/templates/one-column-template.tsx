import { Grid } from "@mui/material";
import { ContactInformation } from "../Sections/contact-information";
import { Experiences } from "../Sections/experiences/experiences";
import { NameJobTitle } from "../Sections/name-job-title";
import { ProfessionalSummary } from "../Sections/professional-summary";
import { Skills } from "../Sections/skills";
import { useAppSelector } from "../store/store-helper";
import { applicantSelector } from "../store/applicant/applicant-slice";

/** One column template */
export function OneColumnTemplate(): JSX.Element | null {
  const applicant = useAppSelector(applicantSelector);

  if (applicant === null) {
    return null;
  }

  return (
    <Grid
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="flex-start"
    >
      <NameJobTitle nameJobTitle={applicant.nameJobTitle} />
      <ContactInformation contactInformation={applicant.contactInformation} />
      <ProfessionalSummary summary={applicant.professionalSummary} />
      <Experiences
        sectionTitle="Work Experience"
        experiences={applicant.workExperiences}
      />
      <Experiences sectionTitle="Education" experiences={applicant.education} />
      <Skills
        skills={applicant.skills}
        indicatorType={applicant.style.skillIndicatorType}
      />
    </Grid>
  );
}
