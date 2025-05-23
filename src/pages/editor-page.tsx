import { Paper, TextField } from "@mui/material";
import { TemplateButton } from "../components/template-button";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "../common/custom-styles";
import {
  cvDataSelector,
  updateProfessionalSummary,
} from "../store/applicant/applicant-slice";
import { useSelector } from "react-redux";
import { ExperienceEditorPage } from "./editor-page/experience-editor-page";
import { EducationEditorPage } from "./editor-page/education-editor-page";
import { SkillsEditorPage } from "./editor-page/skills-editor-page";
import { useAppDispatch } from "../store/store-helper";
import { PersonalInfoEditorPage } from "./editor-page/personal-info-editor-page";
import { ContactInfoEditorPage } from "./editor-page/contact-info-editor-page";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function EditorPage({ contentRef }: Props): JSX.Element {
  const { professionalSummary } = useSelector(cvDataSelector);
  const dispatch = useAppDispatch();

  return (
    <Paper
      elevation={3}
      sx={{
        width: `${A4_WIDTH_MM}mm`,
        minHeight: `${A4_HEIGHT_MM}mm`,
        padding: "20mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <TemplateButton printReference={contentRef} />
      <PersonalInfoEditorPage />
      <ContactInfoEditorPage />

      <TextField
        label="Professional Summary"
        variant="outlined"
        multiline
        value={professionalSummary}
        fullWidth
        sx={{
          mt: "20px",
          "& .MuiInputBase-input": {
            resize: "vertical",
          },
        }}
        onChange={(event) =>
          dispatch(updateProfessionalSummary({ value: event.target.value }))
        }
      />

      <ExperienceEditorPage />
      <EducationEditorPage />
      <SkillsEditorPage />
    </Paper>
  );
}
