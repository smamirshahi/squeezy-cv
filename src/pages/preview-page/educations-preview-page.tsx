import { Grid } from "@mui/material";
import { Section } from "@custom-types/vault-types";
import { DatePeriod } from "@components/date-period";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { IconWithText } from "@components/icon-with-text";
import { CvTypography } from "@components/cv-typography";

interface Props {
  section: Section;
}

/** Renders the whole education part in preview page */
export function EducationsPreviewPage({ section }: Props): JSX.Element | null {
  if (section.items.length === 0) {
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
      {section.items.map(
        (item) =>
          item.shouldShow && (
            <Grid
              key={item.id}
              container
              direction="column"
              alignItems="flex-start"
              sx={{ mb: "10px" }}
            >
              <CvTypography
                variant="headingSm"
                text={item.fields.degree ?? ""}
              />
              <Grid container direction="row" alignItems="center" gap={3}>
                <CvTypography
                  variant="bodyMd"
                  text={item.fields.institute ?? ""}
                />
                <IconWithText
                  icon={LocationOnIcon}
                  text={item.fields.location ?? ""}
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
            </Grid>
          )
      )}
    </Grid>
  );
}
