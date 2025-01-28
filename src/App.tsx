import "./App.css";
import { NameJobTitle } from "./Sections/name-job-title";
import { ContactInformation } from "./Sections/contact-information";
import { ProfessionalSummary } from "./Sections/professional-summary";
import { WorkExperience } from "./Sections/work-experience";
import { Skills } from "./Sections/skills";
import { Education } from "./Sections/education";

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
