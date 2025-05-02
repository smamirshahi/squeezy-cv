import {
  BodyText,
  SectionTitle,
  SubsectionText,
} from "../common/custom-typography";
import { Grid2 } from "@mui/material";
import { ApplicationStyle, SkillWithLevelProps } from "../common/custom-types";
import { LevelIndicator } from "../components/level-indicator";

interface Props {
  /** The skills the user has */
  skills: SkillWithLevelProps[];

  /** How to show the skill level */
  indicatorType: ApplicationStyle["skillIndicatorType"];
}

// FIXME: This needs to be completed
/** Skills section (Areas of Expertise) */
export function Skills({ skills, indicatorType }: Props): JSX.Element {
  return (
    <Grid2 container direction="column" alignItems="flex-start">
      <SectionTitle text="Skills" />
      {skills.map((skill) => (
        <Grid2 container direction="row" alignItems="center">
          <SubsectionText text={skill.mainSkillName} />
          {skill.subSkill.map((subSkill) => (
            <>
              <BodyText text={subSkill.name} />
              <LevelIndicator
                indicatorType={indicatorType}
                percentage={subSkill.percentage}
              />
            </>
          ))}
        </Grid2>
      ))}
    </Grid2>
  );
}
