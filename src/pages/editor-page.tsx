import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Paper,
} from "@mui/material";
import { EditorPageButtons } from "@src/components/editor-page-buttons";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@customTypes/custom-styles";
import { ExperienceEditorPage } from "@pages/editor-page/experience-editor-page";
import { EducationEditorPage } from "@pages/editor-page/education-editor-page";
import { SkillsEditorPage } from "@pages/editor-page/skills-editor-page";
import { PersonalInfoEditorPage } from "@pages/editor-page/personal-info-editor-page";
import { ContactInfoEditorPage } from "@pages/editor-page/contact-info-editor-page";
import { SummaryEditorPage } from "@pages/editor-page/summary-editor-page";
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
import { StylesEditorPage } from "@src/pages/editor-page/styles-editor-page/styles-editor-page";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function EditorPage({ contentRef }: Props): JSX.Element {
  const cvData = useAppSelector(cvDataSelector);

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
  }, [
    cvData.contactInfo,
    cvData.educations,
    cvData.experiences,
    cvData.personalInfo,
    cvData.professionalSummary,
    cvData.skills,
    setEducations,
    setExperiences,
    setSkills,
  ]);

  function updateCvData(): void {
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
      <EditorPageButtons
        printReference={contentRef}
        onApplyClicked={updateCvData}
      />
      <StylesEditorPage />
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
    </Paper>
  );
}
