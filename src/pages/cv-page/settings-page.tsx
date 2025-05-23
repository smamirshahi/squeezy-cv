import { Paper, TextField } from "@mui/material";
import { TemplateButton } from "../../components/template-button";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "../../common/custom-styles";
import {
  cvDataSelector,
  updateProfessionalSummary,
} from "../../store/applicant/applicant-slice";
import { useSelector } from "react-redux";
import { SettingsPageExperience } from "../settings-page/settings-page-experience";
import { SettingsPageEducation } from "../settings-page/settings-page-education";
import { SettingsPageSkills } from "../settings-page/settings-page-skills";
import { useAppDispatch } from "../../store/store-helper";
import { SettingsPagePersonalInfo } from "../settings-page/settings-page-personal-info";
import { SettingsPageContactInfo } from "../settings-page/settings-page-contact-info";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function SettingsPage({ contentRef }: Props): JSX.Element {
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
      <SettingsPagePersonalInfo />
      <SettingsPageContactInfo />

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

      <SettingsPageExperience />
      <SettingsPageEducation />
      <SettingsPageSkills />
    </Paper>
  );
}
