import { Box, Grid } from "@components/ui";
import { GAP_PX, spaced } from "@custom-styles/custom-styles";
import { normaliseLink } from "@shared/vault/link-utils";
import { RenderedSection } from "@shared/variant/render";
import { useAppSelector } from "@store/store-helper";
import { useResolvedStyle } from "@hooks/use-resolved-style";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { DatePeriod } from "@components/date-period";
import { LocationOnOutlined as LocationOnIcon } from "@components/ui/icons";
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
  const { accent } = useResolvedStyle();
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
      {visibleItems.map((item) => {
        return (
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
                  columnGap: 3,
                  rowGap: 0,
                }}
              >
                <CvTypography
                  variant="bodyMd"
                  isEmphasised={item.emphasis === "high"}
                  text={item.fields.subtitle ?? ""}
                />
                <CvTypography
                  variant="bodyMd"
                  isEmphasised={item.emphasis === "high"}
                  text={item.fields.projectType ?? ""}
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
              {item.fields.technologies && (
                <CvTypography
                  variant="bodyMd"
                  text={`Technologies: ${item.fields.technologies}`}
                />
              )}
              {item.fields.link && (
                <CvTypography
                  variant="bodyMd"
                  text={item.fields.link.replace(/^https?:\/\//, "")}
                  href={normaliseLink(item.fields.link)}
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
        );
      })}
    </Grid>
  );
}
