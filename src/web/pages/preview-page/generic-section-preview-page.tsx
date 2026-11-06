import { Box, Grid } from "@mui/material";
import { GAP_PX, spaced } from "@custom-styles/custom-styles";
import { RenderedSection } from "@shared/variant/render";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { DatePeriod } from "@components/date-period";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { IconWithText } from "@components/icon-with-text";
import { CvBlock } from "@components/cv-block";
import { CvTypography } from "@components/cv-typography";
import { getBulletListStyle } from "@pages/preview-page/bullet-list-style";

interface Props {
  section: RenderedSection;
}

/** Renders a section without a special layout (projects, certifications, ...) */
export function GenericSectionPreviewPage({
  section,
}: Props): JSX.Element | null {
  const { bulletPointIcon } = useAppSelector(styleSelector);
  const visibleItems = section.items;

  if (visibleItems.length === 0) {
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
      {visibleItems.map((item) => (
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
              text={item.fields.title ?? ""}
            />
            <Grid
              container
              direction="row"
              sx={{
                alignItems: "center",
                gap: 3,
              }}
            >
              <CvTypography
                variant="bodyMd"
                isEmphasised={item.emphasis === "high"}
                text={item.fields.subtitle ?? ""}
              />
              <IconWithText
                icon={LocationOnIcon}
                text={item.fields.location ?? ""}
                variant="bodyMd"
              />
            </Grid>
            {item.fields.startDate && (
              <DatePeriod
                datePeriod={{
                  start: item.fields.startDate,
                  end: item.fields.endDate,
                }}
              />
            )}
            {item.fields.description && (
              <CvTypography
                variant="bulletText"
                text={item.fields.description}
              />
            )}
          </CvBlock>
          {item.bullets.length > 0 && (
            <Box
              component="ul"
              sx={{
                my: "0px",
                pl: "20px",
                ...getBulletListStyle(bulletPointIcon),
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
