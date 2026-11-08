import { SectionTitleField } from "@pages/editor-page/sections/section-title-field";
import { SectionItems } from "@pages/workspace/section-items";
import { EditorSummary } from "@pages/editor-page/sections/editor-summary";
import { EditorMainInfo } from "@pages/editor-page/sections/editor-main-info";
import { EditorPageSection } from "@pages/editor-page/editor-types";
import { Section } from "@custom-types/vault-types";
import { sectionsSelector } from "@store/vault/vault-slice";
import { useAppSelector } from "@store/store-helper";

/** The page of one vault section, chosen by its type */
function renderSectionEditor(section: Section): JSX.Element {
  if (section.type === "summary") {
    return (
      <>
        <SectionTitleField key={`title-${section.id}`} section={section} />
        <EditorSummary key={section.id} sectionId={section.id} />
      </>
    );
  }
  return <SectionItems key={section.id} section={section} />;
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
