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
import { EditorPageSection } from "@pages/editor-page/editor-types";
import { useAppSelector } from "@store/store-helper";
import { appSelector } from "@store/app/app-slice";
import { useState } from "react";
import { Experience } from "@custom-types/experience-types";
import { useEditorExperience } from "@pages/editor-page/sections/editor-experience/use-editor-experience";
import { SkillCategory } from "@custom-types/skill-types";
import { Education } from "@custom-types/education-types";
import { useEditorEducation } from "@pages/editor-page/sections/editor-education/use-editor-education";
import { useEditorSkills } from "@pages/editor-page/sections/editor-skills/use-editor-skills";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** Shows the editor section */
export function EditorPage({ contentRef }: Props): JSX.Element {
  const { selectedSectionInEditorPage } = useAppSelector(appSelector);
  const [newExperiences, setNewExperiences] = useState<Experience[]>([]);
  const [newEducations, setNewEducations] = useState<Education[]>([]);
  const [newSkills, setNewSkills] = useState<SkillCategory[]>([]);

  const { addExperience } = useEditorExperience({ setNewExperiences });
  const { addEducation } = useEditorEducation({
    setNewEducations,
  });
  const { addSkillCategory } = useEditorSkills({ setNewSkills });

  const editorPageSections: EditorPageSection = {
    metadata: {
      id: "metadata",
      label: "Meta Data",
      content: <EditorMetaData />,
    },
    typography: {
      id: "typography",
      label: "Typography",
      content: <EditorTypography />,
    },
    template: {
      id: "template",
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
      content: (
        <EditorExperience
          newExperiences={newExperiences}
          setNewExperiences={setNewExperiences}
        />
      ),
      additionalButton: {
        label: "Add new Experience",
        onClick: () => {
          addExperience();
        },
      },
    },
    educations: {
      id: "educations",
      label: "Educations",
      content: (
        <EditorEducation
          newEducations={newEducations}
          setNewEducations={setNewEducations}
        />
      ),
      additionalButton: {
        label: "Add new Education",
        onClick: () => {
          addEducation();
        },
      },
    },
    skills: {
      id: "skills",
      label: "Skills",
      content: (
        <EditorSkills newSkills={newSkills} setNewSkills={setNewSkills} />
      ),
      additionalButton: {
        label: "Add new Skill Category",
        onClick: () => {
          addSkillCategory();
        },
      },
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
      <EditorFooter
        additionalButton={
          editorPageSections[selectedSectionInEditorPage].additionalButton
        }
      />
    </Paper>
  );
}
