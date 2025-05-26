import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Grid,
  Paper,
} from "@mui/material";
import { TemplateButton } from "../components/template-button";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "../custom-types/custom-styles";
import { ExperienceEditorPage } from "./editor-page/experience-editor-page";
import { EducationEditorPage } from "./editor-page/education-editor-page";
import { SkillsEditorPage } from "./editor-page/skills-editor-page";
import { PersonalInfoEditorPage } from "./editor-page/personal-info-editor-page";
import { ContactInfoEditorPage } from "./editor-page/contact-info-editor-page";
import { SummaryEditorPage } from "./editor-page/summary-editor-page";
import { useImportExportJson } from "@src/hooks/use-import-export-json";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  ContactInfo,
  PersonalInfo,
  ProfessionalSummary,
} from "@src/custom-types/json-types";
import { useEffect, useState } from "react";
import { cvDataSelector, setCvData } from "@src/store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@src/store/store-helper";
import { useEditorPageUpdate } from "@src/hooks/use-editor-page-update";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function EditorPage({ contentRef }: Props): JSX.Element {
  const cvData = useAppSelector(cvDataSelector);
  const { handleExport } = useImportExportJson();
  const dispatch = useAppDispatch();
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(
    cvData.personalInfo
  );

  const [contactInfo, setContactInfo] = useState<ContactInfo>(
    cvData.contactInfo
  );
  const [summary, setSummary] = useState<ProfessionalSummary>(
    cvData.professionalSummary
  );
  const {
    experiences,
    setExperiences,
    educations,
    setEducations,
    skills,
    setSkills,
  } = useEditorPageUpdate();

  // Add the initial values to the state variables
  useEffect(() => {
    setPersonalInfo(cvData.personalInfo);
    setContactInfo(cvData.contactInfo);
    setSummary(cvData.professionalSummary);
    setExperiences(cvData.experiences);
    setEducations(cvData.educations);
    setSkills(cvData.skills);
  }, [cvData]);

  function updateCvData() {
    const newCvData = {
      personalInfo,
      contactInfo,
      professionalSummary: summary,
      experiences,
      educations,
      skills,
    };
    dispatch(setCvData(newCvData));
  }

  return (
    <Paper
      elevation={3}
      sx={{
        width: `${A4_WIDTH_MM}mm`,
        minHeight: `${A4_HEIGHT_MM}mm`,
        padding: "20mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <TemplateButton printReference={contentRef} />
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          Profile
        </AccordionSummary>
        <AccordionDetails>
          <PersonalInfoEditorPage
            personalInfo={personalInfo}
            setPersonalInfo={setPersonalInfo}
          />
          <ContactInfoEditorPage
            contactInfo={contactInfo}
            setContactInfo={setContactInfo}
          />
        </AccordionDetails>
      </Accordion>
      <SummaryEditorPage summary={summary} setSummary={setSummary} />
      <ExperienceEditorPage />
      <EducationEditorPage />
      <SkillsEditorPage />
      <Grid
        container
        direction="row"
        justifyContent="flex-end"
        sx={{ mt: "20px" }}
        gap={2}
      >
        <Button variant="contained" onClick={updateCvData}>
          Apply
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          startIcon={<DownloadIcon />}
        >
          Save
        </Button>
      </Grid>
    </Paper>
  );
}
