import { Grid, Rating } from "@mui/material";
import { Section } from "@custom-types/vault-types";
import React from "react";
import { CvTypography } from "@components/cv-typography";
import { useRatingIcon } from "@hooks/use-rating-icon";

interface Props {
  section: Section;
}

/** Skills section (Areas of Expertise) */
export function SkillsPreviewPage({ section }: Props): JSX.Element | null {
  const RatingIcon = useRatingIcon();

  if (section.items.length === 0) {
    return null;
  }

  return (
    <>
      <CvTypography variant="headingMd" text={section.title} />
      {section.items.map(
        (group) =>
          group.shouldShow && (
            <React.Fragment key={group.id}>
              <CvTypography
                variant="headingSm"
                text={group.fields.category ?? ""}
              />
              <Grid container direction="row" alignItems="flex-start">
                {group.bullets.map((skill) => (
                  <Grid
                    key={skill.id}
                    container
                    direction="row"
                    alignItems="center"
                  >
                    <CvTypography variant="bulletText" text={skill.text} />
                    <Rating
                      value={skill.rating ?? 0}
                      precision={0.5}
                      readOnly
                      icon={RatingIcon.icon}
                      emptyIcon={RatingIcon.emptyIcon}
                    />
                  </Grid>
                ))}
              </Grid>
            </React.Fragment>
          )
      )}
    </>
  );
}
