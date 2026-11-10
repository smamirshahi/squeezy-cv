import { normaliseLink } from "@shared/vault/link-utils";
import { Box, Grid } from "@mui/material";
import { GAP_PX, spaced } from "@custom-styles/custom-styles";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { useResolvedStyle } from "@hooks/use-resolved-style";
import { RenderedSection } from "@shared/variant/render";
import { DatePeriod } from "@components/date-period";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { IconWithText } from "@components/icon-with-text";
import { CvBlock } from "@components/cv-block";
import { CvTypography } from "@components/cv-typography";
import { ItemDescription } from "@pages/preview-page/item-description";
import { getBulletListStyle } from "@pages/preview-page/bullet-list-style";
import { locationLabel, workModeOf } from "@shared/vault/item-fields";

interface Props {
  section: RenderedSection;
}

/** Renders the whole experiences part */
export function ExperiencesPreviewPage({ section }: Props): JSX.Element | null {
  const { bulletPointIcon } = useAppSelector(styleSelector);
  const { accent } = useResolvedStyle();

  const listStyleType = getBulletListStyle(bulletPointIcon);

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
          sx={{
            flexDirection: "column",
            alignItems: "flex-start",
            mb: spaced(GAP_PX.item),
          }}
        >
          <CvBlock shouldKeepWithNext>
            <CvTypography
              variant="headingSm"
              isEmphasised={item.emphasis === "high"}
              text={item.fields.jobTitle ?? ""}
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
                text={item.fields.company ?? ""}
                href={normaliseLink(item.fields.link)}
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
          </CvBlock>
          <ItemDescription text={item.fields.description} />
          {item.bullets.length > 0 && (
            <Box
              component="ul"
              sx={{
                my: "0px",
                pl: "20px",
                ...listStyleType,
                "& li::marker": { color: accent },
              }}
            >
              {item.bullets.map((bullet) => (
                <li
                  key={bullet.id}
                  data-cv-block=""
                  style={{ breakInside: "avoid" }}
                >
                  <CvTypography variant="bulletText" text={bullet.text} />
                </li>
              ))}
            </Box>
          )}
        </Grid>
      ))}
    </Grid>
  );
}
