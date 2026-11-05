import { Box, Grid } from "@mui/material";
import { Section } from "@custom-types/vault-types";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { DatePeriod } from "@components/date-period";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { IconWithText } from "@components/icon-with-text";
import { CvTypography } from "@components/cv-typography";
import { getBulletListStyle } from "@pages/preview-page/bullet-list-style";

interface Props {
  section: Section;
}

/** Renders a section without a special layout (projects, certifications, ...) */
export function GenericSectionPreviewPage({
  section,
}: Props): JSX.Element | null {
  const { bulletPointIcon } = useAppSelector(styleSelector);
  const visibleItems = section.items.filter((item) => item.shouldShow);

  if (visibleItems.length === 0) {
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
      {visibleItems.map((item) => (
        <Grid
          container
          key={item.id}
          direction="column"
          alignItems="flex-start"
          sx={{ mb: "10px" }}
        >
          <CvTypography variant="headingSm" text={item.fields.title ?? ""} />
          <Grid container direction="row" alignItems="center" gap={3}>
            <CvTypography variant="bodyMd" text={item.fields.subtitle ?? ""} />
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
            <CvTypography variant="bulletText" text={item.fields.description} />
          )}
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
                <li key={bullet.id}>
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
