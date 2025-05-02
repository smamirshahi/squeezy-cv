import { BodyText, SubsectionText } from "../../common/custom-typography";
import { Grid2 } from "@mui/material";
import { LevelIndicator } from "./level-indicator";
import { ApplicationStyle } from "../../common/custom-types";

interface Props {
  /** The name of skill */
  mainSkillName: string;

  subSkill: {
    /** The name of the subSkill */
    name: string;

    /** The percentage of the subSkill */
    percentage: number;
  }[];

  /** How to show the skill level */
  indicatorType: ApplicationStyle["skillIndicatorType"];
}

/** Shows the skill name with the level */
export function SkillWithLevel({
  mainSkillName,
  subSkill,
  indicatorType,
}: Props): JSX.Element {
  return (
    <Grid2 container direction="row" alignItems="center">
      <SubsectionText text={mainSkillName} />
      {subSkill.map((skill) => (
        <>
          <BodyText text={skill.name} />
          <LevelIndicator
            indicatorType={indicatorType}
            percentage={skill.percentage}
          />
        </>
      ))}
    </Grid2>
  );
}
