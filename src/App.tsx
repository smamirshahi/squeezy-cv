import "./App.css";
import { NameJobTitle } from "./Sections/name-job-title";
import { ContactInformation } from "./Sections/contact-information";
import { ProfessionalSummary } from "./Sections/professional-summary";
import { WorkExperiences } from "./Sections/work-experience/work-experiences";
import { Skills } from "./Sections/skills";
import { Educations } from "./Sections/education/educations";
import { Grid2, Paper } from "@mui/material";
import { Application } from "./applicant";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper
        elevation={3}
        sx={{
          width: "210mm",
          minHeight: "297mm",
          padding: "20mm",
          boxSizing: "border-box",
          margin: "auto",
          fontSize: "12pt",
          fontFamily: "Calibri, sans-serif",
        }}
      >
        <Grid2
          container
          direction="column"
          justifyContent="flex-start"
          alignItems="flex-start"
        >
          <NameJobTitle nameJobTitle={Application.nameJobTitle} />
          <ContactInformation
            contactInformation={Application.contactInformation}
          />
          <ProfessionalSummary summary={Application.professionalSummary} />
          <WorkExperiences workExperiences={Application.workExperiences} />
          <Educations educations={Application.education} />
          <Skills />
        </Grid2>
      </Paper>
    </LocalizationProvider>
  );
}

export default App;
