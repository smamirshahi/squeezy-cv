import { SectionTitle } from "../common/custom-typography";
import { Grid2 } from "@mui/material";
import { SkillWithLevel } from "../components/skills/skill-with-level";
import { ApplicationStyle, SkillWithLevelProps } from "../common/custom-types";

interface Props {
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
        <SkillWithLevel
          key={skill.mainSkillName}
          mainSkillName={skill.mainSkillName}
          indicatorType={indicatorType}
          subSkill={skill.subSkill}
        />
      ))}
    </Grid2>
  );
}
