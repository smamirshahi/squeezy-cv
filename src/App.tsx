import "./App.css";
import { ContactInformation } from "./Sections/contact-information";
import { Education } from "./Sections/education";
import { NameJobTitle } from "./Sections/name-job-title";
import { ProfessionalSummary } from "./Sections/professional-summary";
import { Skills } from "./Sections/skills";
import { WorkExperience } from "./Sections/work-experience";

function App() {
  return (
    <>
      <NameJobTitle />
      <ContactInformation />
      <ProfessionalSummary />
      <WorkExperience />
      <Skills />
      <Education />
    </>
  );
}

export default App;
