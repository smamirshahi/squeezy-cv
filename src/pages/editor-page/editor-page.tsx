import { Paper } from "@mui/material";
import { EditorPageButtons } from "@components/editor-page-buttons";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { ExperienceEditorPage } from "@pages/editor-page/experience-editor/experience-editor-page";
import { EducationEditorPage } from "@pages/editor-page/education-editor/education-editor-page";
import { SkillsEditorPage } from "@pages/editor-page/skills-editor/skills-editor-page";
import { PersonalInfoEditorPage } from "@pages/editor-page/personal-info-editor-page";
import { ContactInfoEditorPage } from "@pages/editor-page/contact-info/contact-info-editor-page";
import { SummaryEditorPage } from "@pages/editor-page/summary-editor-page";
import { StylesEditorPage } from "@pages/editor-page/styles-editor-page/styles-editor-page";
import { EditorPageSection } from "@pages/editor-page/editor-page-section";
import { useState } from "react";
import { EditorSectionId } from "@store/app/app-slice-types";
import { MetaDataSection } from "@pages/editor-page/meta-data-section";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** Shows the editor section */
export function EditorPage({ contentRef }: Props): JSX.Element {
  const [expandedSection, setExpandedSection] =
    useState<EditorSectionId | null>(null);

  return (
    <Paper
      elevation={3}
      sx={{
        width: `${A4_DIMENSION_MM.width}mm`,
        minHeight: `${A4_DIMENSION_MM.height}mm`,
        padding: "10mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <EditorPageButtons printReference={contentRef} />
      <EditorPageSection
        title="Metadata"
        sectionId="metadata"
        expandedSection={expandedSection}
        setExpandedSection={setExpandedSection}
      >
        <MetaDataSection />
      </EditorPageSection>

      <EditorPageSection
        title="Styles"
        sectionId="styles"
        expandedSection={expandedSection}
        setExpandedSection={setExpandedSection}
      >
        <StylesEditorPage />
      </EditorPageSection>

      <EditorPageSection
        title="Personal Info"
        sectionId="personalInfo"
        expandedSection={expandedSection}
        setExpandedSection={setExpandedSection}
      >
        <PersonalInfoEditorPage />
      </EditorPageSection>
      <EditorPageSection
        title="Contact Info"
        sectionId="contactInfo"
        expandedSection={expandedSection}
        setExpandedSection={setExpandedSection}
      >
        <ContactInfoEditorPage />
      </EditorPageSection>
      <EditorPageSection
        title="Professional Summary"
        sectionId="summary"
        expandedSection={expandedSection}
        setExpandedSection={setExpandedSection}
      >
        <SummaryEditorPage />
      </EditorPageSection>

      <EditorPageSection
        title="Work Experience"
        sectionId="experiences"
        expandedSection={expandedSection}
        setExpandedSection={setExpandedSection}
      >
        <ExperienceEditorPage />
      </EditorPageSection>

      <EditorPageSection
        title="Educations"
        sectionId="educations"
        expandedSection={expandedSection}
        setExpandedSection={setExpandedSection}
      >
        <EducationEditorPage />
      </EditorPageSection>

      <EditorPageSection
        title="Skills"
        sectionId="skills"
        expandedSection={expandedSection}
        setExpandedSection={setExpandedSection}
      >
        <SkillsEditorPage />
      </EditorPageSection>
    </Paper>
  );
}
