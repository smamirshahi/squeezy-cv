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
import { useAppDispatch } from "@store/store-helper";
import { setSelectedSectionInEditorPage } from "@store/app/app-slice";
import { EditorPageButtons } from "@components/editor-page-buttons";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { ExperienceEditorPage } from "@pages/editor-page/experience-editor/experience-editor-page";
import { EducationEditorPage } from "@pages/editor-page/education-editor/education-editor-page";
import { SkillsEditorPage } from "@pages/editor-page/skills-editor/skills-editor-page";
import { PersonalInfoEditorPage } from "@pages/editor-page/personal-info/personal-info-editor-page";
import { ContactInfoEditorPage } from "@pages/editor-page/contact-info/contact-info-editor-page";
import { SummaryEditorPage } from "@pages/editor-page/summary/summary-editor-page";
import { StylesEditorPage } from "@pages/editor-page/styles-editor-page/styles-editor-page";
import { EditorPageSection } from "@pages/editor-page/editor-page-section";
import { MetaDataSection } from "@pages/editor-page/meta-data/meta-data-section";
import { PageFormatEditorPage } from "@pages/editor-page/page-structure/page-structure-editor-page";

const DRAWER_WIDTH = 200;

const SECTIONS = [
  { id: "metadata", label: "Metadata" },
  { id: "typography", label: "Typography" },
  { id: "template", label: "Page Structure" },
  { id: "personalInfo", label: "Personal Info" },
  { id: "contactInfo", label: "Contact Info" },
  { id: "summary", label: "Professional Summary" },
  { id: "experiences", label: "Work Experience" },
  { id: "educations", label: "Educations" },
  { id: "skills", label: "Skills" },
] as const;

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** Shows the editor section */
export function EditorPage({ contentRef }: Props): JSX.Element {
  const dispatch = useAppDispatch();

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
      }}
    >
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Editor
          </Typography>
        </Toolbar>
      </AppBar>
      <Box display={"flex"} flexDirection="row" gap={2} p={2}>
        <Box>
          <Drawer
            className="mohammad"
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
              {SECTIONS.map((section) => (
                <ListItem key={section.id} disablePadding>
                  <ListItemButton
                    onClick={() =>
                      dispatch(setSelectedSectionInEditorPage(section.id))
                    }
                  >
                    <ListItemText primary={section.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Drawer>
        </Box>
        <Box>
          <EditorPageButtons printReference={contentRef} />
          <EditorPageSection title="Metadata" sectionId="metadata">
            <MetaDataSection />
          </EditorPageSection>

          <EditorPageSection title="Typography" sectionId="typography">
            <StylesEditorPage />
          </EditorPageSection>

          <EditorPageSection title="Page Structure" sectionId="template">
            <PageFormatEditorPage />
          </EditorPageSection>

          <EditorPageSection title="Personal Info" sectionId="personalInfo">
            <PersonalInfoEditorPage />
          </EditorPageSection>

          <EditorPageSection title="Contact Info" sectionId="contactInfo">
            <ContactInfoEditorPage />
          </EditorPageSection>

          <EditorPageSection title="Professional Summary" sectionId="summary">
            <SummaryEditorPage />
          </EditorPageSection>

          <EditorPageSection title="Work Experience" sectionId="experiences">
            <ExperienceEditorPage />
          </EditorPageSection>

          <EditorPageSection title="Educations" sectionId="educations">
            <EducationEditorPage />
          </EditorPageSection>

          <EditorPageSection title="Skills" sectionId="skills">
            <SkillsEditorPage />
          </EditorPageSection>
        </Box>
      </Box>
    </Paper>
  );
}
