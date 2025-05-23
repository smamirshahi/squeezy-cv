import { Grid } from "@mui/material";
import { ContactInfoPreviewPage } from "../pages/preview-page/contact-info-preview-page";
import { ExperiencesPreviewPage } from "../pages/preview-page/experiences-preview-page";
import { PersonalInfoPreviewPage } from "../pages/preview-page/personal-info-preview-page";
import { SummaryPreviewPage } from "../pages/preview-page/summary-preview-page";
import { SkillsPreviewPage } from "../pages/preview-page/skills-preview-page";

/** Two column template */
export function TwoColumnTemplate(): JSX.Element | null {
  return (
    <Grid
      container
      direction="row"
      justifyContent="flex-start"
      alignItems="flex-start"
    >
      <PersonalInfoPreviewPage />
      <Grid size={{ xs: 8 }}>
        <SummaryPreviewPage />
        <ExperiencesPreviewPage />
        <ExperiencesPreviewPage />
      </Grid>
      <Grid size={{ xs: 4 }}>
        <ContactInfoPreviewPage />
        <SkillsPreviewPage />
      </Grid>
    </Grid>
  );
}
