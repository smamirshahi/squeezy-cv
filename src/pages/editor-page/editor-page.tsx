import { Paper, Box } from "@mui/material";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { ExperienceEditorPage } from "@pages/editor-page/experience-editor/experience-editor-page";
import { EducationEditorPage } from "@pages/editor-page/education-editor/education-editor-page";
import { SkillsEditorPage } from "@pages/editor-page/skills-editor/skills-editor-page";
import { SummaryEditorPage } from "@pages/editor-page/summary/summary-editor-page";
import { StylesEditorPage } from "@pages/editor-page/styles-editor-page/styles-editor-page";
import { MetaDataEditorPage } from "@pages/editor-page/meta-data/meta-data-editor-page";
import { PageFormatEditorPage } from "@pages/editor-page/page-structure/page-structure-editor-page";
import { MainInfoEditorPage } from "@pages/editor-page/main-info/main-info-editor-page";
import { EditorPageFooter } from "@pages/editor-page/editor-page-footer";
import { AppBarEditorPage } from "@pages/editor-page/app-bar-editor-page";
import { SideBarEditorPage } from "@pages/editor-page/side-bar-editor-page";
import { EditorPageContent } from "@pages/editor-page/editor-page-content";
import { EditorPageSection } from "@pages/editor-page/editor-page-types";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** Shows the editor section */
export function EditorPage({ contentRef }: Props): JSX.Element {
  const editorPageSections: EditorPageSection = {
    metadata: {
      id: "metadata",
      label: "Metadata",
      component: <MetaDataEditorPage />,
    },
    typography: {
      id: "typography",
      label: "Typography",
      component: <StylesEditorPage />,
    },
    template: {
      id: "template",
      label: "Page Structure",
      component: <PageFormatEditorPage />,
    },
    mainInfo: {
      id: "mainInfo",
      label: "Main Info",
      component: <MainInfoEditorPage />,
    },
    summary: {
      id: "summary",
      label: "Professional Summary",
      component: <SummaryEditorPage />,
    },
    experiences: {
      id: "experiences",
      label: "Work Experience",
      component: <ExperienceEditorPage />,
    },
    educations: {
      id: "educations",
      label: "Educations",
      component: <EducationEditorPage />,
    },
    skills: {
      id: "skills",
      label: "Skills",
      component: <SkillsEditorPage />,
    },
  };

  return (
    <Paper
      elevation={3}
      sx={{
        width: `${A4_DIMENSION_MM.height}mm`,
        padding: "0mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ height: "800px", overflowY: "scroll" }}>
        <AppBarEditorPage contentRef={contentRef} />
        <Box display="flex" flexDirection="row" gap={2} p={2}>
          <SideBarEditorPage editorPageSections={editorPageSections} />
          <EditorPageContent editorPageSections={editorPageSections} />
        </Box>
      </Box>
      <EditorPageFooter />
    </Paper>
  );
}
