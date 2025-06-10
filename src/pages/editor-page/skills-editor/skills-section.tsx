import { SkillCategory, SkillItem } from "@custom-types/json-types";
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
  skill: SkillCategory;
  skillItem: SkillItem;
  skillItemIndex: number;
}

export function UpdateSkillItemNameSection({
  skill,
  skillItem,
  skillItemIndex,
}: UpdateSkillItemSectionProps): JSX.Element {
  const { localState, setLocalState } = useDebounceCallback({
    reduxState: skillItem.name,
    createAction: (localState) =>
      updateSkillItem({
        skillId: skill.id,
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
