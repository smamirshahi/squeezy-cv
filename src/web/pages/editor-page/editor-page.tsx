import { Paper, Box } from "@mui/material";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { EditorExperience } from "@pages/editor-page/sections/editor-experience/editor-experience";
import { EditorEducation } from "@pages/editor-page/sections/editor-education/editor-education";
import { EditorSkills } from "@pages/editor-page/sections/editor-skills/editor-skills";
import { EditorGenericSection } from "@pages/editor-page/sections/editor-generic-section/editor-generic-section";
import { AiAssistant } from "@pages/ai-page/ai-assistant";
import { EditorVariants } from "@pages/editor-page/sections/editor-variants";
import { EditorSections } from "@pages/editor-page/sections/editor-sections";
import { EditorSummary } from "@pages/editor-page/sections/editor-summary";
import { EditorTypography } from "@pages/editor-page/sections/editor-style-settings/editor-style-settings";
import { EditorMetaData } from "@pages/editor-page/sections/editor-meta-data";
import { EditorPageStructure } from "@pages/editor-page/sections/editor-page-structure/editor-page-structure";
import { EditorMainInfo } from "@pages/editor-page/sections/editor-main-info";
import { EditorFooter } from "@pages/editor-page/editor-footer";
import { EditorAppBar } from "@pages/editor-page/editor-app-bar";
import { EditorSideBar } from "@pages/editor-page/editor-side-bar";
import { EditorPageSection } from "@pages/editor-page/editor-types";
import { Section } from "@custom-types/vault-types";
import { sectionsSelector } from "@store/vault/vault-slice";
import { useAppSelector } from "@store/store-helper";
import { appSelector } from "@store/app/app-slice";

/** Shows the editor section */
/** The editor for one vault section, chosen by the type of the section */
function renderSectionEditor(section: Section): JSX.Element {
  switch (section.type) {
    case "summary":
      return <EditorSummary key={section.id} sectionId={section.id} />;
    case "experience":
      return <EditorExperience key={section.id} sectionId={section.id} />;
    case "education":
      return <EditorEducation key={section.id} sectionId={section.id} />;
    case "skills":
      return <EditorSkills key={section.id} sectionId={section.id} />;
    default:
      return <EditorGenericSection key={section.id} sectionId={section.id} />;
  }
}

/** Shows the editor section */
export function EditorPage(): JSX.Element {
  const { selectedSectionInEditorPage } = useAppSelector(appSelector);
  const sections = useAppSelector(sectionsSelector);

  const editorPageSections: EditorPageSection = [
    { id: "metaData", label: "Meta Data", content: <EditorMetaData /> },
    {
      id: "styleSettings",
      label: "Style Settings",
      content: <EditorTypography />,
    },
    {
      id: "pageStructure",
      label: "Page Structure",
      content: <EditorPageStructure />,
    },
    { id: "variants", label: "Variants", content: <EditorVariants /> },
    { id: "ai", label: "AI assistant", content: <AiAssistant /> },
    { id: "sections", label: "Sections", content: <EditorSections /> },
    { id: "mainInfo", label: "Main Info", content: <EditorMainInfo /> },
    ...sections.map((section) => ({
      id: section.id,
      label: section.title,
      content: renderSectionEditor(section),
    })),
  ];

  // A deleted or unknown page falls back to the first one
  const selectedPage =
    editorPageSections.find(
      (page) => page.id === selectedSectionInEditorPage
    ) ?? editorPageSections[0];

  return (
    <Paper
      elevation={3}
      sx={{
        // Grows up to the old fixed width, shrinks (and wraps below the preview's row) on narrow screens
        flex: "1 1 480px",
        maxWidth: `${A4_DIMENSION_MM.height}mm`,
        minWidth: 0,
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
        <EditorAppBar />
        <Box display="flex" flexDirection="row" gap={2} p={2}>
          <EditorSideBar editorPageSections={editorPageSections} />
          <Box sx={{ width: "100%" }}>{selectedPage.content}</Box>
        </Box>
      </Box>
      <EditorFooter />
    </Paper>
  );
}
