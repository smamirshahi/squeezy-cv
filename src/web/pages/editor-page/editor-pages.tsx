import { EditorExperience } from "@pages/editor-page/sections/editor-experience/editor-experience";
import { EditorEducation } from "@pages/editor-page/sections/editor-education/editor-education";
import { EditorSkills } from "@pages/editor-page/sections/editor-skills/editor-skills";
import { EditorGenericSection } from "@pages/editor-page/sections/editor-generic-section/editor-generic-section";
import { AiAssistant } from "@pages/ai-page/ai-assistant";
import { EditorJobs } from "@pages/editor-page/sections/editor-jobs";
import { EditorSections } from "@pages/editor-page/sections/editor-sections";
import { EditorSummary } from "@pages/editor-page/sections/editor-summary";
import { EditorTypography } from "@pages/editor-page/sections/editor-style-settings/editor-style-settings";
import { EditorMetaData } from "@pages/editor-page/sections/editor-meta-data";
import { EditorMainInfo } from "@pages/editor-page/sections/editor-main-info";
import { EditorPageSection } from "@pages/editor-page/editor-types";
import { Section } from "@custom-types/vault-types";
import { renameSection, sectionsSelector } from "@store/vault/vault-slice";
import { TextField } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/** The editor for one vault section, chosen by the type of the section */
function renderSectionEditor(section: Section): JSX.Element {
  return (
    <>
      <SectionTitleField key={`title-${section.id}`} section={section} />
      {renderTypedEditor(section)}
    </>
  );
}

/** The title of a section, renamed at once (the name shown in the tree and on the CV) */
function SectionTitleField({ section }: { section: Section }): JSX.Element {
  const dispatch = useAppDispatch();
  return (
    <TextField
      label="Section title"
      size="small"
      value={section.title}
      onChange={(event) =>
        dispatch(renameSection({ id: section.id, title: event.target.value }))
      }
      sx={{ mb: 2, minWidth: 280 }}
    />
  );
}

function renderTypedEditor(section: Section): JSX.Element {
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

/** All pages of the editor: the fixed ones, then one per vault section */
export function useEditorPages(): EditorPageSection {
  const sections = useAppSelector(sectionsSelector);

  return [
    { id: "metaData", label: "Job data", content: <EditorMetaData /> },
    {
      id: "styleSettings",
      label: "Style Settings",
      content: <EditorTypography />,
    },
    { id: "variants", label: "Jobs", content: <EditorJobs /> },
    { id: "ai", label: "AI assistant", content: <AiAssistant /> },
    { id: "sections", label: "Sections", content: <EditorSections /> },
    { id: "mainInfo", label: "Main Info", content: <EditorMainInfo /> },
    ...sections.map((section) => ({
      id: section.id,
      label: section.title,
      content: renderSectionEditor(section),
    })),
  ];
}
