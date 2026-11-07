import { Grid } from "@mui/material";
import { RenderedSection } from "@shared/variant/render";
import { CvTypography } from "@components/cv-typography";

interface Props {
  section: RenderedSection;
}

/** Shows the professional summary page in preview mode */
export function SummaryPreviewPage({ section }: Props): JSX.Element | null {
  const text = section.items[0]?.fields.text;

  if (!text) {
    return null;
  }
  return (
    <Grid
      data-cv-section={section.id}
      container
      sx={{
        flexDirection: "column",
        alignItems: "flex-start",
        m: "0px",
        p: "0px",
      }}
    >
      <CvTypography
        variant="headingMd"
        pageBreak="keep-with-next"
        text={section.title}
        sectionStyle={section.sectionStyle}
      />
      <CvTypography variant="bulletText" pageBreak="avoid-inside" text={text} />
    </Grid>
  );
}
