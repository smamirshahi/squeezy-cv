import { Grid, Rating } from "@mui/material";
import { useAppSelector } from "@store/store-helper";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import React from "react";
import { CvTypography } from "@components/cv-typography";
import { PreviewSection } from "@components/preview-section";

/** Skills section (Areas of Expertise) */
export function SkillsPreviewPage(): JSX.Element | null {
  const { skills } = useAppSelector(cvDataSelector);

  if (skills.length === 0) {
    return null;
  }

  return (
    <PreviewSection sectionId="skills">
      <CvTypography variant="headingMd" text="Skills" />
      {skills.map((skill) => (
        <React.Fragment key={skill.id}>
          <CvTypography variant="headingSm" text={skill.category} />
          <Grid container direction="row" alignItems="flex-start">
            {skill.items.map((item) => (
              <Grid key={item.id} container direction="row" alignItems="center">
                <CvTypography variant="bulletText" text={item.name} />
                <Rating value={item.rating} precision={0.5} readOnly />
              </Grid>
            ))}
          </Grid>
        </React.Fragment>
      ))}
    </PreviewSection>
  );
}
