import { Grid } from "@components/ui";
import { GAP_PX, spaced } from "@custom-styles/custom-styles";
import { RenderedSection } from "@shared/variant/render";
import { formatCitation } from "@shared/vault/citation";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { vaultSelector } from "@store/vault/vault-slice";
import { CvBlock } from "@components/cv-block";
import { CvCitation } from "@components/cv-citation";
import { CvTypography } from "@components/cv-typography";

interface Props {
  section: RenderedSection;
}

/** Publications: one line per paper in the citation style of the template; the link is visible text at the end */
export function PublicationsPreviewPage({
  section,
}: Props): JSX.Element | null {
  const { citationStyle, publicationLinks, highlightOwnName, maxAuthors } =
    useAppSelector(styleSelector);
  const { profile } = useAppSelector(vaultSelector);
  const ownName = profile.citationName?.trim() || profile.fullName;

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
            <CvCitation
              isEmphasised={item.emphasis === "high"}
              segments={formatCitation(item.fields, {
                style: citationStyle,
                links: publicationLinks,
                highlightOwnName,
                maxAuthors,
                ownName,
              })}
            />
          </CvBlock>
        </Grid>
      ))}
    </Grid>
  );
}
