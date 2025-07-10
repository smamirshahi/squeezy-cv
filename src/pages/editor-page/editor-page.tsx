import {
  AppBar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Toolbar,
  Typography,
  Box,
  Button,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  appSelector,
  setSelectedSectionInEditorPage,
} from "@store/app/app-slice";
import { EditorPageButtons } from "@components/editor-page-buttons";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { ExperienceEditorPage } from "@pages/editor-page/experience-editor/experience-editor-page";
import { EducationEditorPage } from "@pages/editor-page/education-editor/education-editor-page";
import { SkillsEditorPage } from "@pages/editor-page/skills-editor/skills-editor-page";
import { SummaryEditorPage } from "@pages/editor-page/summary/summary-editor-page";
import { StylesEditorPage } from "@pages/editor-page/styles-editor-page/styles-editor-page";
import { MetaDataSection } from "@pages/editor-page/meta-data/meta-data-section";
import { PageFormatEditorPage } from "@pages/editor-page/page-structure/page-structure-editor-page";
import { EditorSectionId } from "@store/app/app-slice-types";
import { MainInfoEditorPage } from "@pages/editor-page/main-info/main-info-editor-page";
import {
  cvDataSelector,
  metaDataSelector,
  setExperiences,
  setEducations,
  setSkills,
  setContactInfo,
  setMetaData,
  setPersonalInfo,
  setProfessionalSummary,
} from "@store/cv-data/cv-data-slice";
import { useEffect, useState } from "react";
import { PersonalInfo } from "@custom-types/personal-info-types";
import { ContactInfo } from "@custom-types/contact-info-types";
import { MetaData } from "@custom-types/json-types";
import { ProfessionalSummary } from "@custom-types/summary-types";
import { Experience } from "@custom-types/experience-types";
import { Education } from "@custom-types/education-types";
import { SkillCategory } from "@custom-types/skill-types";

const DRAWER_WIDTH = 200;

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** Shows the editor section */
export function EditorPage({ contentRef }: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const { selectedSectionInEditorPage } = useAppSelector(appSelector);
  const metaData = useAppSelector(metaDataSelector);
  const {
    personalInfo,
    contactInfo,
    professionalSummary,
    experiences,
    educations,
    skills,
  } = useAppSelector(cvDataSelector);

  const [shouldShowApplyButton, setShouldShowApplyButton] =
    useState<boolean>(true);

  const [newMetaData, setNewMetaData] = useState<MetaData>(metaData);
  const [newPersonalInfo, setNewPersonalInfo] =
    useState<PersonalInfo>(personalInfo);
  const [newContactInfo, setNewContactInfo] =
    useState<ContactInfo>(contactInfo);
  const [newSummary, setNewSummary] =
    useState<ProfessionalSummary>(professionalSummary);
  const [newExperiences, setNewExperiences] =
    useState<Experience[]>(experiences);
  const [newEducations, setNewEducations] = useState<Education[]>(educations);
  const [newSkills, setNewSkills] = useState<SkillCategory[]>(skills);

  useEffect(() => {
    switch (selectedSectionInEditorPage) {
      case "metadata":
      case "mainInfo":
      case "summary":
      case "experiences":
        setShouldShowApplyButton(true);

        break;
      case "typography":
      case "template":
      case "educations":
      case "skills":
        setShouldShowApplyButton(false);
        break;
    }
  }, [selectedSectionInEditorPage]);

  useEffect(() => {
    setNewMetaData(metaData);
    setNewPersonalInfo(personalInfo);
    setNewContactInfo(contactInfo);
    setNewSummary(professionalSummary);
    setNewExperiences(experiences);
    setNewEducations(educations);
    setNewSkills(skills);
  }, [
    contactInfo,
    metaData,
    personalInfo,
    professionalSummary,
    experiences,
    educations,
    skills,
  ]);

  const SECTIONS: {
    [key in EditorSectionId]: {
      id: key;
      label: string;
      component: JSX.Element;
    };
  } = {
    metadata: {
      id: "metadata",
      label: "Metadata",
      component: (
        <MetaDataSection
          newMetaData={newMetaData}
          setNewMetaData={setNewMetaData}
        />
      ),
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
      component: (
        <MainInfoEditorPage
          newPersonalInfo={newPersonalInfo}
          setNewPersonalInfo={setNewPersonalInfo}
          newContactInfo={newContactInfo}
          setNewContactInfo={setNewContactInfo}
        />
      ),
    },
    summary: {
      id: "summary",
      label: "Professional Summary",
      component: (
        <SummaryEditorPage
          newSummary={newSummary}
          setNewSummary={setNewSummary}
        />
      ),
    },
    experiences: {
      id: "experiences",
      label: "Work Experience",
      component: (
        <ExperienceEditorPage
          newExperiences={newExperiences}
          setNewExperiences={setNewExperiences}
        />
      ),
    },
    educations: {
      id: "educations",
      label: "Educations",
      component: (
        <EducationEditorPage
          newEducations={newEducations}
          setNewEducations={setNewEducations}
        />
      ),
    },
    skills: {
      id: "skills",
      label: "Skills",
      component: (
        <SkillsEditorPage newSkills={newSkills} setNewSkills={setNewSkills} />
      ),
    },
  };

  function onApplyClicked(): void {
    switch (selectedSectionInEditorPage) {
      case "metadata":
        dispatch(setMetaData(newMetaData));
        break;

      case "mainInfo":
        dispatch(setPersonalInfo(newPersonalInfo));
        dispatch(setContactInfo(newContactInfo));
        break;
      case "summary":
        dispatch(setProfessionalSummary(newSummary));
        break;
      case "experiences":
        dispatch(setExperiences(newExperiences));
        break;
      case "educations":
        dispatch(setEducations(newEducations));
        break;
      case "skills":
        dispatch(setSkills(newSkills));
        break;

      default:
        break;
    }
  }

  function onDiscardClicked(): void {
    setNewMetaData(metaData);
    setNewPersonalInfo(personalInfo);
    setNewContactInfo(contactInfo);
    setNewSummary(professionalSummary);
    setNewExperiences(experiences);
    setNewEducations(educations);
    setNewSkills(skills);
  }

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
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Editor
            </Typography>
            <EditorPageButtons printReference={contentRef} />
          </Toolbar>
        </AppBar>
        <Box display={"flex"} flexDirection="row" gap={2} p={2}>
          <Box>
            <Drawer
              variant="permanent"
              sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                ["& .MuiDrawer-paper"]: {
                  position: "relative",
                  width: DRAWER_WIDTH,
                  boxSizing: "border-box",
                },
              }}
            >
              <Toolbar />
              <List>
                {Object.values(SECTIONS).map((value) => (
                  <ListItem key={value.id} disablePadding>
                    <ListItemButton
                      onClick={() =>
                        dispatch(setSelectedSectionInEditorPage(value.id))
                      }
                      selected={selectedSectionInEditorPage === value.id}
                    >
                      <ListItemText primary={value.label} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Drawer>
          </Box>
          <Box sx={{ width: "100%" }}>
            {SECTIONS[selectedSectionInEditorPage].component}
          </Box>
        </Box>
      </Box>
      {shouldShowApplyButton && (
        <Box
          display="flex"
          justifyContent="flex-end"
          sx={{ mr: "20px", my: "20px" }}
          gap={2}
        >
          <Button variant="contained" onClick={onApplyClicked}>
            Apply
          </Button>
          <Button variant="contained" onClick={onDiscardClicked}>
            Discard
          </Button>
        </Box>
      )}
    </Paper>
  );
}
