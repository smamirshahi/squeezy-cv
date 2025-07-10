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
import { metaDataSelector, setMetaData } from "@store/cv-data/cv-data-slice";
import { useState } from "react";

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

  const [jobTitle, setJobTitle] = useState<string>(metaData.title);
  const [jobUrl, setJobUrl] = useState<string>(metaData.jobUrl);

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
          jobTitle={jobTitle}
          setJobTitle={setJobTitle}
          jobUrl={jobUrl}
          setJobUrl={setJobUrl}
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
    skills: { id: "skills", label: "Skills", component: <SkillsEditorPage /> },
  };

  function onApplyClicked(): void {
    switch (selectedSectionInEditorPage) {
      case "metadata":
        dispatch(setMetaData({ field: "title", value: jobTitle }));
        dispatch(setMetaData({ field: "jobUrl", value: jobUrl }));
        break;
      case "typography":
        console.log("Typography changes applied");
        break;
      case "template":
        console.log("Template changes applied");
        break;
      case "mainInfo":
        console.log("Main Info changes applied");
        break;
      case "summary":
        console.log("Summary changes applied");
        break;
      case "experiences":
        console.log("Experiences changes applied");
        break;
      case "educations":
        console.log("Educations changes applied");
        break;
      case "skills":
        console.log("Skills changes applied");
        break;
    }
  }

  function onDiscardClicked(): void {
    setJobTitle(metaData.title);
    setJobUrl(metaData.jobUrl);
  }

  return (
    <Paper
      elevation={3}
      sx={{
        width: `${A4_DIMENSION_MM.height}mm`,
        minHeight: `${A4_DIMENSION_MM.width}mm`,
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
      <Box>
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
      <Box
        className="mohammad"
        display="flex"
        justifyContent="flex-end"
        sx={{ mr: "20px", mb: "20px" }}
        gap={2}
      >
        <Button variant="contained" onClick={onApplyClicked}>
          Apply
        </Button>
        <Button variant="contained" onClick={onDiscardClicked}>
          Discard
        </Button>
      </Box>
    </Paper>
  );
}
