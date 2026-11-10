import { normaliseLink } from "@shared/vault/link-utils";
import { Grid } from "@mui/material";
import { GAP_PX, spaced } from "@custom-styles/custom-styles";
import { RenderedSection } from "@shared/variant/render";
import { DatePeriod } from "@components/date-period";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { IconWithText } from "@components/icon-with-text";
import { CvBlock } from "@components/cv-block";
import { CvTypography } from "@components/cv-typography";
import { ItemDescription } from "@pages/preview-page/item-description";
import { locationLabel, workModeOf } from "@shared/vault/item-fields";

interface Props {
  section: RenderedSection;
}

/** Renders the whole education part in preview page */
export function EducationsPreviewPage({ section }: Props): JSX.Element | null {
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
          key={item.id}
          data-cv-item={item.id}
          container
          sx={{
            flexDirection: "column",
            alignItems: "flex-start",
            mb: spaced(GAP_PX.item),
            breakInside: "avoid",
          }}
        >
          <CvBlock>
            <CvTypography
              variant="headingSm"
              isEmphasised={item.emphasis === "high"}
              text={item.fields.degree ?? ""}
            />
            <Grid
              container
              direction="row"
              sx={{
                alignItems: "center",
                columnGap: 3,
                rowGap: 0,
              }}
            >
              <CvTypography
                variant="bodyMd"
                isEmphasised={item.emphasis === "high"}
                text={item.fields.institute ?? ""}
                href={normaliseLink(item.fields.link)}
              />
              <CvTypography
                variant="bodyMd"
                text={item.fields.fieldOfStudy ?? ""}
              />
              <IconWithText
                icon={LocationOnIcon}
                text={locationLabel(
                  item.fields.location,
                  workModeOf(item.fields)
                )}
                variant="bodyMd"
              />
            </Grid>
            <DatePeriod
              datePeriod={{
                start: item.fields.startDate ?? "",
                end: item.fields.endDate,
              }}
            />

            {item.fields.dissertationTitle && (
              <CvTypography
                variant="bulletText"
                text={`Dissertation Title: ${item.fields.dissertationTitle}`}
              />
            )}
          </CvBlock>
          <ItemDescription text={item.fields.description} />
        </Grid>
      ))}
    </Grid>
  );
}
