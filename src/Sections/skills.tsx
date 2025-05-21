import {
  BodyText,
  SectionTitle,
  SubsectionText,
} from "../common/custom-typography";
import { Grid } from "@mui/material";
import { LevelIndicator } from "../components/level-indicator";
import { useAppSelector } from "../store/store-helper";
import {
  cvDataSelector,
  styleSelector,
} from "../store/applicant/applicant-slice";

// FIXME: This needs to be completed
/** Skills section (Areas of Expertise) */
export function Skills(): JSX.Element {
  const { template } = useAppSelector(styleSelector);
  const { skills } = useAppSelector(cvDataSelector);
  const { ratingIcon } = useAppSelector(styleSelector);

  return (
    <>
      <SectionTitle text="Skills" />
      {skills.map((skill) => (
        <>
          <SubsectionText
            text={skill.category}
            customSx={{ textAlign: "left" }}
          />
          <Grid
            container
            direction={template === "one-column" ? "row" : "column"}
            alignItems="flex-start"
          >
            {skill.items.map((item) => (
              <Grid container direction="row" alignItems="center">
                <BodyText text={item.name} customSx={{ mr: "10px" }} />
                <LevelIndicator
                  indicatorType={ratingIcon}
                  percentage={item.rating}
                />
              </Grid>
            ))}
          </Grid>
        </>
      ))}
    </>
  );
}
