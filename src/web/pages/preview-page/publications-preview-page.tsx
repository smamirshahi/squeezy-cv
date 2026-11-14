import { Grid } from "@components/ui";
import { GAP_PX, spaced } from "@custom-styles/custom-styles";
import { RenderedSection } from "@shared/variant/render";
import { formatCitation } from "@shared/vault/citation";
import { normaliseLink } from "@shared/vault/link-utils";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { CvBlock } from "@components/cv-block";
import { CvTypography } from "@components/cv-typography";

interface Props {
  section: RenderedSection;
}

/** Publications: one line per paper in the citation style of the template, linked when it has a link */
export function PublicationsPreviewPage({
  section,
}: Props): JSX.Element | null {
  const { citationStyle } = useAppSelector(styleSelector);

  if (section.items.length === 0) {
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
      />
      {section.items.map((item) => (
        <Grid
          container
          key={item.id}
          data-cv-item={item.id}
          sx={{ mb: spaced(GAP_PX.item) }}
        >
          <CvBlock>
            <CvTypography
              variant="bulletText"
              isEmphasised={item.emphasis === "high"}
              text={formatCitation(item.fields, citationStyle)}
              href={normaliseLink(item.fields.link)}
            />
          </CvBlock>
        </Grid>
      ))}
    </Grid>
  );
}
