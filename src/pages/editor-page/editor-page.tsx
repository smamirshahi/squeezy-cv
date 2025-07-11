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
import { MetaDataEditorPage } from "@pages/editor-page/meta-data/meta-data-editor-page";
import { PageFormatEditorPage } from "@pages/editor-page/page-structure/page-structure-editor-page";
import { EditorSectionId } from "@store/app/app-slice-types";
import { MainInfoEditorPage } from "@pages/editor-page/main-info/main-info-editor-page";
import { metaDataSelector } from "@store/cv-data/cv-data-slice";
import { useEffect, useState } from "react";
import { EditorPageFooter } from "@pages/editor-page/editor-page-footer";

const DRAWER_WIDTH = 200;

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** Shows the editor section */
export function EditorPage({ contentRef }: Props): JSX.Element {
  const metaData = useAppSelector(metaDataSelector);
  const dispatch = useAppDispatch();
  const { selectedSectionInEditorPage } = useAppSelector(appSelector);

  const [shouldShowApplyButton, setShouldShowApplyButton] =
    useState<boolean>(true);

  useEffect(() => {
    switch (selectedSectionInEditorPage) {
      case "metadata":
      case "mainInfo":
      case "summary":
      case "experiences":
      case "educations":
      case "skills":
        setShouldShowApplyButton(true);
        break;
      case "typography":
      case "template":
        setShouldShowApplyButton(false);
        break;
    }
  }, [selectedSectionInEditorPage]);

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
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              App version: {metaData.version}
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
      {shouldShowApplyButton && <EditorPageFooter />}
    </Paper>
  );
}
