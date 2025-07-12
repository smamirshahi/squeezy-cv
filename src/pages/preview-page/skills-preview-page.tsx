import { Grid, Rating } from "@mui/material";
import { useAppSelector } from "@store/store-helper";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import React from "react";
import { CvTypography } from "@components/cv-typography";
import { useRatingIcon } from "@hooks/use-rating-icon";

/** Skills section (Areas of Expertise) */
export function SkillsPreviewPage(): JSX.Element | null {
  const { skills } = useAppSelector(cvDataSelector);

  const RatingIcon = useRatingIcon();

  if (skills.length === 0) {
    return null;
  }

  return (
    <>
      <CvTypography variant="headingMd" text="Skills" />
      {skills.map((skill) => (
        <React.Fragment key={skill.id}>
          <CvTypography variant="headingSm" text={skill.category} />
          <Grid container direction="row" alignItems="flex-start">
            {skill.items.map((item) => (
              <Grid key={item.id} container direction="row" alignItems="center">
                <CvTypography variant="bulletText" text={item.name} />
                <Rating
                  value={item.rating}
                  precision={0.5}
                  readOnly
                  icon={RatingIcon.icon}
                  emptyIcon={RatingIcon.emptyIcon}
                />
              </Grid>
            ))}
          </Grid>
        </React.Fragment>
      ))}
    </>
  );
}
