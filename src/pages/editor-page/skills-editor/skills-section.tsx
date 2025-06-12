import { SkillCategory, SkillItem } from "@custom-types/skill-types";
import { useDebounceCallback } from "@hooks/use-debounce-callback";
import { TextField } from "@mui/material";
import {
  updateSkillCategory,
  updateSkillItem,
} from "@store/cv-data/cv-data-slice";

interface UpdateSkillSectionProps {
  skill: SkillCategory;
}

export function UpdateSkillCategorySection({
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
  skillItem: SkillItem;
  skillItemIndex: number;
}

export function UpdateSkillItemNameSection({
  skillItem,
  skillItemIndex,
}: UpdateSkillItemSectionProps): JSX.Element {
  const { localState, setLocalState } = useDebounceCallback({
    reduxState: skillItem.name,
    createAction: (localState) =>
      updateSkillItem({
        skillItemId: skillItem.id,
        key: "name",
        value: localState,
      }),
  });

  return (
    <TextField
      label={`Skill Item ${skillItemIndex + 1}`}
      value={localState}
      onChange={(event) => setLocalState(event.target.value)}
      fullWidth
    />
  );
}
