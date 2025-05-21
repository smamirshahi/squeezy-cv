import {
  BodyText,
  SectionTitle,
  SubsectionText,
} from "../common/custom-typography";
import { Grid } from "@mui/material";
import { LevelIndicator } from "../components/level-indicator";
import { templateSelector } from "../store/ui/ui-slice";
import { useAppSelector } from "../store/store-helper";
import { applicantSelector } from "../store/applicant/applicant-slice";

// FIXME: This needs to be completed
/** Skills section (Areas of Expertise) */
export function Skills(): JSX.Element {
  const template = useAppSelector(templateSelector);
  const { skills, style } = useAppSelector(applicantSelector);

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
            {skill.item.map((subSkill) => (
              <Grid container direction="row" alignItems="center">
                <BodyText text={subSkill.name} customSx={{ mr: "10px" }} />
                <LevelIndicator
                  indicatorType={style.skillIndicatorType}
                  percentage={subSkill.rate}
                />
              </Grid>
            ))}
          </Grid>
        </>
      ))}
    </>
  );
}
