import {
  BulletPoint,
  Experience,
  SkillCategory,
} from "@custom-types/json-types";
import { useDebounceCallback } from "@hooks/use-debounce-callback";
import { TextField } from "@mui/material";
import {
  updateExperienceBulletPoint,
  updateSkillCategory,
} from "@store/cv-data/cv-data-slice";

interface UpdateSkillSectionProps {
  skill: SkillCategory;
}

export function UpdateSkillSection({
  skill,
}: UpdateSkillSectionProps): JSX.Element {
  const { localState, setLocalState } = useDebounceCallback({
    reduxState: skill.category,
    createAction: (localState) =>
      updateSkillCategory({
        skillId: skill.id,
        key: "category",
        value: localState,
      }),
  });

  return (
    <TextField
      label="Skill Category"
      value={localState}
      onChange={(event) => setLocalState(event.target.value)}
      fullWidth
    />
  );
}

interface UpdateSkillItemSectionProps {
  experience: Experience;
  bulletPoint: BulletPoint;
  bulletPointIndex: number;
}

export function UpdateSkillItemSection({
  experience,
  bulletPoint,
  bulletPointIndex,
}: UpdateSkillItemSectionProps): JSX.Element {
  const { localState, setLocalState } = useDebounceCallback({
    reduxState: bulletPoint.text,
    createAction: (localState) =>
      updateExperienceBulletPoint({
        experienceId: experience.id,
        bulletPointId: bulletPoint.id,
        value: localState,
      }),
  });

  return (
    <TextField
      label={`Bullet Point ${bulletPointIndex + 1}`}
      value={localState}
      onChange={(event) => setLocalState(event.target.value)}
      fullWidth
      // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
      InputLabelProps={{ shrink: true }}
    />
  );
}
