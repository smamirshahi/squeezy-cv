import { Grid } from "@mui/material";
import { ContactInfoPreviewPage } from "./contact-info-preview-page";
import { ExperiencesPreviewPage } from "./experiences-preview-page";
import { PersonalInfoPreviewPage } from "./personal-info-preview-page";
import { SummaryPreviewPage } from "./summary-preview-page";
import { SkillsPreviewPage } from "./skills-preview-page";

/** Two column template */
export function TwoColumnPreviewPage(): JSX.Element | null {
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
