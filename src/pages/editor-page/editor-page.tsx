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

  function onExpandedSectionClicked(sectionId: EditorSectionId): void {
    expandedSection === sectionId
      ? setExpandedSection(null)
      : setExpandedSection(sectionId);
  }

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
        isExpanded={expandedSection === "metadata"}
        handleChange={onExpandedSectionClicked}
      >
        <MetaDataSection />
      </EditorPageSection>

      <EditorPageSection
        title="Styles"
        sectionId="styles"
        isExpanded={expandedSection === "styles"}
        handleChange={onExpandedSectionClicked}
      >
        <StylesEditorPage />
      </EditorPageSection>

      <EditorPageSection
        title="Personal Info"
        sectionId="personalInfo"
        isExpanded={expandedSection === "personalInfo"}
        handleChange={onExpandedSectionClicked}
      >
        <PersonalInfoEditorPage />
      </EditorPageSection>
      <EditorPageSection
        title="Contact Info"
        sectionId="contactInfo"
        isExpanded={expandedSection === "contactInfo"}
        handleChange={onExpandedSectionClicked}
      >
        <ContactInfoEditorPage />
      </EditorPageSection>
      <EditorPageSection
        title="Professional Summary"
        sectionId="summary"
        isExpanded={expandedSection === "summary"}
        handleChange={onExpandedSectionClicked}
      >
        <SummaryEditorPage />
      </EditorPageSection>

      <EditorPageSection
        title="Work Experience"
        sectionId="experiences"
        isExpanded={expandedSection === "experiences"}
        handleChange={onExpandedSectionClicked}
      >
        <ExperienceEditorPage />
      </EditorPageSection>

      <EditorPageSection
        title="Educations"
        sectionId="educations"
        isExpanded={expandedSection === "educations"}
        handleChange={onExpandedSectionClicked}
      >
        <EducationEditorPage />
      </EditorPageSection>

      <EditorPageSection
        title="Skills"
        sectionId="skills"
        isExpanded={expandedSection === "skills"}
        handleChange={onExpandedSectionClicked}
      >
        <SkillsEditorPage />
      </EditorPageSection>
    </Paper>
  );
}
