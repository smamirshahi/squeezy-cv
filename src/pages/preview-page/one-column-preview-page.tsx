import { Grid } from "@mui/material";
import { ContactInfoPreviewPage } from "./contact-info-preview-page";
import { ExperiencesPreviewPage } from "./experiences-preview-page";
import { PersonalInfoPreviewPage } from "./personal-info-preview-page";
import { SummaryPreviewPage } from "./summary-preview-page";
import { SkillsPreviewPage } from "./skills-preview-page";

/** One column preview page */
export function OneColumnPreviewPage(): JSX.Element | null {
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
