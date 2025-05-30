import { Grid, Rating } from "@mui/material";
import { useAppSelector } from "@store/store-helper";
import { cvDataSelector, styleSelector } from "@store/cv-data/cv-data-slice";
import React from "react";
import { CvTypographyNew } from "@components/cv-typography";

/** Skills section (Areas of Expertise) */
export function SkillsPreviewPage(): JSX.Element {
  const { template } = useAppSelector(styleSelector);
  const { skills } = useAppSelector(cvDataSelector);

  return (
    <>
      <CvTypographyNew variant="headingLg" text="Skills" />
      {skills.map((skill) => (
        <React.Fragment key={skill.id}>
          <CvTypographyNew variant="headingSm" text={skill.category} />
          <Grid
            container
            direction={template === "one-column" ? "row" : "column"}
            alignItems="flex-start"
          >
            {skill.items.map((item) => (
              <Grid key={item.id} container direction="row" alignItems="center">
                <CvTypographyNew variant="bodyLg" text={item.name} />
                <Rating value={item.rating} precision={0.5} />
              </Grid>
            ))}
          </Grid>
        </React.Fragment>
      ))}
    </>
  );
}
