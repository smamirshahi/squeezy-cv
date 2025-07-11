import { Paper, Box } from "@mui/material";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { EditorExperience } from "@pages/editor-page/sections/editor-experience/editor-experience";
import { EditorEducation } from "@pages/editor-page/sections/editor-education/editor-education";
import { EditorSkills } from "@pages/editor-page/sections/editor-skills/editor-skills";
import { EditorSummary } from "@pages/editor-page/sections/editor-summary";
import { EditorTypography } from "@pages/editor-page/sections/editor-typography/editor-typography";
import { EditorMetaData } from "@pages/editor-page/sections/editor-meta-data";
import { EditorPageStructure } from "@pages/editor-page/sections/editor-page-structure/editor-page-structure";
import { EditorMainInfo } from "@pages/editor-page/sections/editor-main-info";
import { EditorFooter } from "@pages/editor-page/editor-footer";
import { EditorAppBar } from "@pages/editor-page/editor-app-bar";
import { EditorSideBar } from "@pages/editor-page/editor-side-bar";
import { EditorContent } from "@pages/editor-page/editor-content";
import { EditorPageSection } from "@pages/editor-page/editor-types";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** Shows the editor section */
export function EditorPage({ contentRef }: Props): JSX.Element {
  const editorPageSections: EditorPageSection = {
    metadata: {
      id: "metadata",
      label: "Meta Data",
      component: <EditorMetaData />,
    },
    typography: {
      id: "typography",
      label: "Typography",
      component: <EditorTypography />,
    },
    template: {
      id: "template",
      label: "Page Structure",
      component: <EditorPageStructure />,
    },
    mainInfo: {
      id: "mainInfo",
      label: "Main Info",
      component: <EditorMainInfo />,
    },
    summary: {
      id: "summary",
      label: "Professional Summary",
      component: <EditorSummary />,
    },
    experiences: {
      id: "experiences",
      label: "Work Experience",
      component: <EditorExperience />,
    },
    educations: {
      id: "educations",
      label: "Educations",
      component: <EditorEducation />,
    },
    skills: {
      id: "skills",
      label: "Skills",
      component: <EditorSkills />,
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
        <EditorAppBar contentRef={contentRef} />
        <Box display="flex" flexDirection="row" gap={2} p={2}>
          <EditorSideBar editorPageSections={editorPageSections} />
          <EditorContent editorPageSections={editorPageSections} />
        </Box>
      </Box>
      <EditorFooter />
    </Paper>
  );
}
