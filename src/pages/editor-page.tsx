import { AccordionDetails, Paper } from "@mui/material";
import { EditorPageButtons } from "@components/editor-page-buttons";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@custom-styles/custom-styles";
import { ExperienceEditorPage } from "@pages/editor-page/experience-editor-page";
import { EducationEditorPage } from "@pages/editor-page/education-editor-page";
import { SkillsEditorPage } from "@pages/editor-page/skills-editor-page";
import { PersonalInfoEditorPage } from "@pages/editor-page/personal-info-editor-page";
import { ContactInfoEditorPage } from "@pages/editor-page/contact-info-editor-page";
import { SummaryEditorPage } from "@pages/editor-page/summary-editor-page";
import {
  ContactInfo,
  PersonalInfo,
  ProfessionalSummary,
} from "@custom-types/json-types";
import { useEffect, useState } from "react";
import { cvDataSelector, setCvData } from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { useEditorPageExperiences } from "@hooks/use-editor-page-experiences";
import { useEditorPageEducations } from "@hooks/use-editor-page-educations";
import { useEditorPageSkills } from "@hooks/use-editor-page-skills";
import { StylesEditorPage } from "@pages/editor-page/styles-editor-page/styles-editor-page";
import { CVAccordion } from "@components/cv-accordion";

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

  const { experiences, setExperiences } = useEditorPageExperiences();
  const { educations, setEducations } = useEditorPageEducations();
  const { skills, setSkills } = useEditorPageSkills();

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
      <CVAccordion title="Profile">
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
      </CVAccordion>
      <SummaryEditorPage summary={summary} setSummary={setSummary} />
      <ExperienceEditorPage />
      <EducationEditorPage />
      <SkillsEditorPage />
    </Paper>
  );
}
