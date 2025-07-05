import { Paper } from "@mui/material";
import { EditorPageButtons } from "@components/editor-page-buttons";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { ExperienceEditorPage } from "@pages/editor-page/experience-editor/experience-editor-page";
import { EducationEditorPage } from "@pages/editor-page/education-editor/education-editor-page";
import { SkillsEditorPage } from "@pages/editor-page/skills-editor/skills-editor-page";
import { PersonalInfoEditorPage } from "@pages/editor-page/personal-info/personal-info-editor-page";
import { ContactInfoEditorPage } from "@pages/editor-page/contact-info/contact-info-editor-page";
import { SummaryEditorPage } from "@pages/editor-page/summary/summary-editor-page";
import { StylesEditorPage } from "@pages/editor-page/styles-editor-page/styles-editor-page";
import { EditorPageSection } from "@pages/editor-page/editor-page-section";
import { MetaDataSection } from "@pages/editor-page/meta-data/meta-data-section";
import { PageFormatEditorPage } from "@pages/editor-page/page-structure/page-structure-editor-page";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** Shows the editor section */
export function EditorPage({ contentRef }: Props): JSX.Element {
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
      <EditorPageSection title="Metadata" sectionId="metadata">
        <MetaDataSection />
      </EditorPageSection>

      <EditorPageSection title="Typography" sectionId="typography">
        <StylesEditorPage />
      </EditorPageSection>

      <EditorPageSection title="Page Structure" sectionId="template">
        <PageFormatEditorPage />
      </EditorPageSection>

      <EditorPageSection title="Personal Info" sectionId="personalInfo">
        <PersonalInfoEditorPage />
      </EditorPageSection>

      <EditorPageSection title="Contact Info" sectionId="contactInfo">
        <ContactInfoEditorPage />
      </EditorPageSection>

      <EditorPageSection title="Professional Summary" sectionId="summary">
        <SummaryEditorPage />
      </EditorPageSection>

      <EditorPageSection title="Work Experience" sectionId="experiences">
        <ExperienceEditorPage />
      </EditorPageSection>

      <EditorPageSection title="Educations" sectionId="educations">
        <EducationEditorPage />
      </EditorPageSection>

      <EditorPageSection title="Skills" sectionId="skills">
        <SkillsEditorPage />
      </EditorPageSection>
    </Paper>
  );
}
