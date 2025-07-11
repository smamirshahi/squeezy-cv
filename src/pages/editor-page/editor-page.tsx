import { Paper, Box } from "@mui/material";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { EditorExperience } from "@pages/editor-page/sections/editor-experience/editor-experience";
import { EditorEducation } from "@pages/editor-page/sections/editor-education/editor-education";
import { EditorSkills } from "@pages/editor-page/sections/editor-skills/editor-skills";
import { EditorSummary } from "@pages/editor-page/sections/editor-summary";
import { EditorTypography } from "@pages/editor-page/sections/editor-style-settings/editor-style-settings";
import { EditorMetaData } from "@pages/editor-page/sections/editor-meta-data";
import { EditorPageStructure } from "@pages/editor-page/sections/editor-page-structure/editor-page-structure";
import { EditorMainInfo } from "@pages/editor-page/sections/editor-main-info";
import { EditorFooter } from "@pages/editor-page/editor-footer";
import { EditorAppBar } from "@pages/editor-page/editor-app-bar";
import { EditorSideBar } from "@pages/editor-page/editor-side-bar";
import { EditorPageSection } from "@pages/editor-page/editor-types";
import { useAppSelector } from "@store/store-helper";
import { appSelector } from "@store/app/app-slice";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** Shows the editor section */
export function EditorPage({ contentRef }: Props): JSX.Element {
  const { selectedSectionInEditorPage } = useAppSelector(appSelector);

  const editorPageSections: EditorPageSection = {
    metaData: {
      id: "metaData",
      label: "Meta Data",
      content: <EditorMetaData />,
    },
    styleSettings: {
      id: "styleSettings",
      label: "Style Settings",
      content: <EditorTypography />,
    },
    pageStructure: {
      id: "pageStructure",
      label: "Page Structure",
      content: <EditorPageStructure />,
    },
    mainInfo: {
      id: "mainInfo",
      label: "Main Info",
      content: <EditorMainInfo />,
    },
    summary: {
      id: "summary",
      label: "Professional Summary",
      content: <EditorSummary />,
    },
    experiences: {
      id: "experiences",
      label: "Work Experience",
      content: <EditorExperience />,
    },
    educations: {
      id: "educations",
      label: "Educations",
      content: <EditorEducation />,
    },
    skills: {
      id: "skills",
      label: "Skills",
      content: <EditorSkills />,
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
          <Box sx={{ width: "100%" }}>
            {editorPageSections[selectedSectionInEditorPage].content}
          </Box>
        </Box>
      </Box>
      <EditorFooter />
    </Paper>
  );
}
