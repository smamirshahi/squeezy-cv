import { AccordionDetails, Paper, TextField } from "@mui/material";
import { EditorPageButtons } from "@components/editor-page-buttons";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { ExperienceEditorPage } from "@pages/editor-page/experience-editor/experience-editor-page";
import { EducationEditorPage } from "@pages/editor-page/education-editor/education-editor-page";
import { SkillsEditorPage } from "@pages/editor-page/skills-editor/skills-editor-page";
import { PersonalInfoEditorPage } from "@pages/editor-page/personal-info-editor-page";
import { ContactInfoEditorPage } from "@pages/editor-page/contact-info/contact-info-editor-page";
import { SummaryEditorPage } from "@pages/editor-page/summary-editor-page";
import { StylesEditorPage } from "@pages/editor-page/styles-editor-page/styles-editor-page";
import { CVAccordion } from "@components/cv-accordion";
import { useDebounceCallback } from "@hooks/use-debounce-callback";
import { useAppSelector } from "@store/store-helper";
import { metaDataSelector, setMetaData } from "@store/cv-data/cv-data-slice";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** Shows the editor section */
export function EditorPage({ contentRef }: Props): JSX.Element {
  const metaData = useAppSelector(metaDataSelector);

  const { localState: localJobTitle, setLocalState: setLocalJobTitle } =
    useDebounceCallback({
      reduxState: metaData.title,
      createAction: (value) => setMetaData({ field: "title", value }),
    });

  const { localState: localJobUrl, setLocalState: setLocalJobUrl } =
    useDebounceCallback({
      reduxState: metaData.jobUrl,
      createAction: (value) => setMetaData({ field: "jobUrl", value }),
    });

  return (
    <Paper
      elevation={3}
      sx={{
        width: `${A4_DIMENSION_MM.width}mm`,
        minHeight: `${A4_DIMENSION_MM.height}mm`,
        padding: "20mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <EditorPageButtons printReference={contentRef} />
      <TextField
        fullWidth
        value={localJobTitle}
        onChange={(event) => setLocalJobTitle(event.target.value)}
        sx={{
          mb: "10px",
        }}
        label="job title"
      />
      <TextField
        fullWidth
        value={localJobUrl}
        onChange={(event) => setLocalJobUrl(event.target.value)}
        sx={{
          mb: "10px",
        }}
        label="job url"
        inputProps={{ style: { height: "40px" } }}
      />
      <StylesEditorPage />
      <CVAccordion title="Profile">
        <AccordionDetails>
          <PersonalInfoEditorPage />
          <ContactInfoEditorPage />
        </AccordionDetails>
      </CVAccordion>
      <SummaryEditorPage />
      <ExperienceEditorPage />
      <EducationEditorPage />
      <SkillsEditorPage />
    </Paper>
  );
}
