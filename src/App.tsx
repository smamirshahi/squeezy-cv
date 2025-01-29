import "./App.css";
import { NameJobTitle } from "./Sections/name-job-title";
import { ContactInformation } from "./Sections/contact-information";
import { ProfessionalSummary } from "./Sections/professional-summary";
import { WorkExperience } from "./Sections/work-experience/work-experience";
import { Skills } from "./Sections/skills";
import { Education } from "./Sections/education/education";
import { Grid2 } from "@mui/material";
import { Application } from "./applicant";

function App() {
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
      <WorkExperience workExperience={Application.workExperience} />
      <Education education={Application.education} />
      <Skills />
    </Grid2>
  );
}

export default App;
