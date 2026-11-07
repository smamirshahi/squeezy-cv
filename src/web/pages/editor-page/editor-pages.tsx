import { EditorExperience } from "@pages/editor-page/sections/editor-experience/editor-experience";
import { EditorEducation } from "@pages/editor-page/sections/editor-education/editor-education";
import { EditorSkills } from "@pages/editor-page/sections/editor-skills/editor-skills";
import { EditorGenericSection } from "@pages/editor-page/sections/editor-generic-section/editor-generic-section";
import { UnsortedPlacement } from "@pages/workspace/unsorted-placement";
import { SectionTitleField } from "@pages/editor-page/sections/section-title-field";
import { EditorSummary } from "@pages/editor-page/sections/editor-summary";
import { EditorMainInfo } from "@pages/editor-page/sections/editor-main-info";
import { EditorPageSection } from "@pages/editor-page/editor-types";
import { Section } from "@custom-types/vault-types";
import { sectionsSelector } from "@store/vault/vault-slice";
import { useAppSelector } from "@store/store-helper";

/** The editor for one vault section, chosen by the type of the section */
function renderSectionEditor(section: Section): JSX.Element {
  return (
    <>
      <SectionTitleField key={`title-${section.id}`} section={section} />
      {renderTypedEditor(section)}
    </>
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
    case "unsorted":
      return (
        <>
          <UnsortedPlacement key={`place-${section.id}`} section={section} />
          <EditorGenericSection key={section.id} sectionId={section.id} />
        </>
      );
    default:
      return <EditorGenericSection key={section.id} sectionId={section.id} />;
  }
}

/** All pages of the editor: the fixed ones, then one per vault section */
export function useEditorPages(): EditorPageSection {
  const sections = useAppSelector(sectionsSelector);

  return [
    { id: "mainInfo", label: "Main Info", content: <EditorMainInfo /> },
    ...sections.map((section) => ({
      id: section.id,
      label: section.title,
      content: renderSectionEditor(section),
    })),
  ];
}
