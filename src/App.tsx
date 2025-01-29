import "./App.css";
import { NameJobTitle } from "./Sections/name-job-title";
import { ContactInformation } from "./Sections/contact-information";
import { ProfessionalSummary } from "./Sections/professional-summary";
import { WorkExperience } from "./Sections/work-experience/work-experience";
import { Skills } from "./Sections/skills";
import { Education } from "./Sections/education/education";
import { Grid2 } from "@mui/material";

function App() {
  return (
    <Grid2
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="flex-start"
    >
      <NameJobTitle />
      <ContactInformation />
      <ProfessionalSummary />
      <Grid2>
        <WorkExperience />
      </Grid2>
      <Grid2>
        <Skills />
      </Grid2>
      <Grid2>
        <Education />
      </Grid2>
    </Grid2>
  );
}

export default App;
