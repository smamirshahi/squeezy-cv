import { Box, Grid } from "@mui/material";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { Section } from "@custom-types/vault-types";
import { DatePeriod } from "@components/date-period";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { IconWithText } from "@components/icon-with-text";
import { CvTypography } from "@components/cv-typography";
import { useMemo } from "react";

interface Props {
  section: Section;
}

/** Renders the whole experiences part */
export function ExperiencesPreviewPage({ section }: Props): JSX.Element | null {
  const { bulletPointIcon } = useAppSelector(styleSelector);

  const listStyleType = useMemo(() => {
    switch (bulletPointIcon) {
      case "disc":
        return { listStyleType: "disc" };
      case "circle":
        return { listStyleType: "circle" };
      case "dash":
        return { listStyleType: '"– "' };
      case "square":
        return { listStyleType: "square" };
    }
  }, [bulletPointIcon]);

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
              container
              key={item.id}
              direction="column"
              alignItems="flex-start"
              sx={{ mb: "10px" }}
            >
              <CvTypography
                variant="headingSm"
                text={item.fields.jobTitle ?? ""}
              />
              <Grid container direction="row" alignItems="center" gap={3}>
                <CvTypography
                  variant="bodyMd"
                  text={item.fields.company ?? ""}
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

              {item.bullets.length > 0 && (
                <Box
                  component="ul"
                  sx={{ my: "0px", pl: "20px", ...listStyleType }}
                >
                  {item.bullets.map((bullet) => (
                    <li key={bullet.id}>
                      <CvTypography variant="bulletText" text={bullet.text} />
                    </li>
                  ))}
                </Box>
              )}
            </Grid>
          )
      )}
    </Grid>
  );
}
