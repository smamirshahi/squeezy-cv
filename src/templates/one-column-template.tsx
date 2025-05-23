import { Grid } from "@mui/material";
import { ContactInfoPreviewPage } from "../pages/preview-page/contact-info-preview-page";
import { ExperiencesPreviewPage } from "../pages/preview-page/experiences-preview-page";
import { PersonalInfoPreviewPage } from "../pages/preview-page/personal-info-preview-page";
import { SummaryPreviewPage } from "../pages/preview-page/summary-preview-page";
import { SkillsPreviewPage } from "../pages/preview-page/skills-preview-page";

/** One column template */
export function OneColumnTemplate(): JSX.Element | null {
  return (
    <Grid
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="flex-start"
    >
      <PersonalInfoPreviewPage />
      <ContactInfoPreviewPage />
      <SummaryPreviewPage />
      <ExperiencesPreviewPage />
      <ExperiencesPreviewPage />
      <SkillsPreviewPage />
    </Grid>
  );
}
