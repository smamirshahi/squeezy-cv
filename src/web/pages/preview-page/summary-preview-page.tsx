import { Grid } from "@mui/material";
import { Section } from "@custom-types/vault-types";
import { CvTypography } from "@components/cv-typography";

interface Props {
  section: Section;
}

/** Shows the professional summary page in preview mode */
export function SummaryPreviewPage({ section }: Props): JSX.Element | null {
  const text = section.items.find((i) => i.shouldShow)?.fields.text;

  if (!text) {
    return null;
  }
  return (
    <Grid
      container
      direction="column"
      alignItems="flex-start"
      sx={{ m: "0px", p: "0px" }}
    >
      <CvTypography variant="headingMd" text={section.title} />
      <CvTypography variant="bulletText" text={text} />
    </Grid>
  );
}
