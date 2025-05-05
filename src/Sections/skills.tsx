import {
  BodyText,
  SectionTitle,
  SubsectionText,
} from "../common/custom-typography";
import { Grid } from "@mui/material";
import { ApplicationStyle, SkillWithLevelProps } from "../common/custom-types";
import { LevelIndicator } from "../components/level-indicator";
import { templateSelector } from "../store/ui/ui-slice";
import { useAppSelector } from "../store/store-helper";

interface Props {
  /** The skills the user has */
  skills: SkillWithLevelProps[];

  /** How to show the skill level */
  indicatorType: ApplicationStyle["skillIndicatorType"];
}

// FIXME: This needs to be completed
/** Skills section (Areas of Expertise) */
export function Skills({ skills, indicatorType }: Props): JSX.Element {
  const template = useAppSelector(templateSelector);
  return (
    <>
      <SectionTitle text="Skills" />
      {skills.map((skill) => (
        <>
          <SubsectionText
            text={skill.mainSkillName}
            customSx={{ textAlign: "left" }}
          />
          <Grid
            container
            direction={template === "one-column" ? "row" : "column"}
            alignItems="flex-start"
          >
            {skill.subSkill.map((subSkill) => (
              <Grid container direction="row" alignItems="center">
                <BodyText text={subSkill.name} customSx={{ mr: "10px" }} />
                <LevelIndicator
                  indicatorType={indicatorType}
                  percentage={subSkill.percentage}
                />
              </Grid>
            ))}
          </Grid>
        </>
      ))}
    </>
  );
}
