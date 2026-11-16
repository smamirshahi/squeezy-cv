import dayjs from "dayjs";
import { Grid } from "@components/ui";
import { GAP_PX, spaced } from "@custom-styles/custom-styles";
import { RenderedSection } from "@shared/variant/render";
import { normaliseLink } from "@shared/vault/link-utils";
import { formatStoredDate } from "@shared/vault/item-fields";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { CvBlock } from "@components/cv-block";
import { CvTypography } from "@components/cv-typography";

interface Props {
  section: RenderedSection;
}

function SectionFrame({
  section,
  children,
}: Props & { children: React.ReactNode }): JSX.Element {
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
      {children}
    </Grid>
  );
}

/** Awards: "Title, Issuer, Date" on one line, an optional description under it, linked when it has a link */
export function AwardsPreviewPage({ section }: Props): JSX.Element | null {
  const { dateFormat } = useAppSelector(styleSelector);
  if (section.items.length === 0) {
    return null;
  }
  return (
    <SectionFrame section={section}>
      {section.items.map((item) => {
        const date = formatStoredDate(item.fields.date, (day) =>
          dayjs(day).format(dateFormat)
        );
        const line = [item.fields.title, item.fields.issuer, date]
          .map((part) => part?.trim())
          .filter(Boolean)
          .join(", ");
        return (
          <Grid
            container
            key={item.id}
            data-cv-item={item.id}
            sx={{ flexDirection: "column", mb: spaced(GAP_PX.item) }}
          >
            <CvBlock shouldKeepWithNext>
              <CvTypography
                variant="headingSm"
                isEmphasised={item.emphasis === "high"}
                text={line}
                href={normaliseLink(item.fields.link)}
              />
              {item.fields.description?.trim() && (
                <CvTypography
                  variant="bulletText"
                  text={item.fields.description}
                />
              )}
            </CvBlock>
          </Grid>
        );
      })}
    </SectionFrame>
  );
}

/** Personal interests: the line of interests, with an optional detail after a dash */
export function InterestsPreviewPage({ section }: Props): JSX.Element | null {
  if (section.items.length === 0) {
    return null;
  }
  return (
    <SectionFrame section={section}>
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
              text={[item.fields.title, item.fields.detail]
                .map((part) => part?.trim())
                .filter(Boolean)
                .join(" – ")}
            />
          </CvBlock>
        </Grid>
      ))}
    </SectionFrame>
  );
}
